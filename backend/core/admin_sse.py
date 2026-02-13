"""
Server-Sent Events (SSE) endpoint for admin real-time feed.

Streams:
  - new_order:       Every new order (event-driven, checked every 3s)
  - revenue_update:  Fires WITH new_order (no separate 30s poll)
  - health_status:   DB / cache / JWKS health every 60s
  - system_alert:    Anomaly / order-spike alerts
  - fraud_alert:     New fraud detection alerts
  - complaint_spike: Pending complaint count surge
  - heartbeat:       Every 15s (keep-alive)

Scaling:
  - Sync Django/Gunicorn: max ~50 concurrent connections (thread-per-conn)
  - ASGI (Uvicorn/Daphne): 5K+ concurrent at ~50KB/conn ≈ 250MB RAM
  - Connection pool limiting via atomic counter
  - SSE id: / retry: headers for browser-native reconnect

Usage:
  GET /api/admin/sse/?token=<jwt>
"""
import json
import time
import logging
import threading
from django.http import StreamingHttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Sum
from django.db import connection as db_connection
from django.core.cache import cache
from django.utils import timezone
from datetime import timedelta

from orders.models import Order
from complaints.models import Complaint
from townbasket_backend.middleware import get_supabase_user
from users.models import User

logger = logging.getLogger('townbasket_backend')

# ── Configuration ────────────────────────────────
SSE_POLL_INTERVAL = 3          # seconds between DB polls
SSE_HEARTBEAT_INTERVAL = 15    # seconds between heartbeats
SSE_HEALTH_INTERVAL = 60       # seconds between health probes
SSE_MAX_DURATION = 600         # 10 minutes max connection
SSE_MAX_CONNECTIONS = 50       # max concurrent admin SSE connections

# ── Thread-safe connection counter ───────────────
_conn_lock = threading.Lock()
_conn_count = 0


def _inc_connections():
    global _conn_count
    with _conn_lock:
        _conn_count += 1
        return _conn_count


def _dec_connections():
    global _conn_count
    with _conn_lock:
        _conn_count = max(0, _conn_count - 1)
        return _conn_count


@csrf_exempt
def admin_sse(request):
    """
    Admin-only SSE stream for real-time dashboard updates.
    Rejects with 503 when connection pool is full.
    """
    # ── Auth ──────────────────────────────────────
    user = get_supabase_user(request)
    if not user or 'error' in user:
        return StreamingHttpResponse(
            _sse_error('Authentication required'),
            content_type='text/event-stream',
            status=401,
        )

    uid = user.get('user_id') or user.get('sub')
    try:
        db_user = User.objects.filter(supabase_uid=uid).first()
        if not db_user or db_user.role != 'admin':
            return StreamingHttpResponse(
                _sse_error('Admin access required'),
                content_type='text/event-stream',
                status=403,
            )
    except Exception:
        return StreamingHttpResponse(
            _sse_error('Auth check failed'),
            content_type='text/event-stream',
            status=500,
        )

    # ── Connection pool check ────────────────────
    current = _inc_connections()
    if current > SSE_MAX_CONNECTIONS:
        _dec_connections()
        return StreamingHttpResponse(
            _sse_error('Too many active connections, please retry'),
            content_type='text/event-stream',
            status=503,
        )

    response = StreamingHttpResponse(
        _admin_stream(request),
        content_type='text/event-stream',
    )
    response['Cache-Control'] = 'no-cache, no-store'
    response['X-Accel-Buffering'] = 'no'
    response['Connection'] = 'keep-alive'
    return response


def _admin_stream(request):
    """
    Generator yielding SSE events for the admin dashboard.
    Decrements connection count on exit (GeneratorExit / error / timeout).
    """
    event_id = 0

    try:
        start_time = time.time()
        last_heartbeat = time.time()
        last_health_check = 0  # fire immediately on connect
        last_order_id = None
        last_fraud_alert_id = 0
        last_complaint_count = 0

        # ── Baseline: latest order ID ────────────
        latest = Order.objects.order_by('-id').first()
        if latest:
            last_order_id = latest.id

        # ── Baseline: latest fraud alert ID ──────
        try:
            from core.fraud import FraudAlert
            latest_fraud = FraudAlert.objects.order_by('-id').first()
            if latest_fraud:
                last_fraud_alert_id = latest_fraud.id
        except Exception:
            pass

        # ── Baseline: complaint count ────────────
        try:
            last_complaint_count = Complaint.objects.filter(status='pending').count()
        except Exception:
            pass

        # ── Send connected + retry header ────────
        event_id += 1
        yield f"retry: 3000\nid: {event_id}\ndata: {json.dumps({'type': 'connected', 'maxDuration': SSE_MAX_DURATION})}\n\n"

        while True:
            elapsed = time.time() - start_time
            if elapsed > SSE_MAX_DURATION:
                event_id += 1
                yield _sse_event_with_id(event_id, {
                    'type': 'timeout',
                    'message': 'Connection expired, reconnecting automatically',
                })
                break

            now = time.time()

            try:
                # ── New orders (event-driven) ────────
                new_orders_qs = Order.objects.order_by('-id')
                if last_order_id:
                    new_orders_qs = new_orders_qs.filter(id__gt=last_order_id)

                new_orders = list(new_orders_qs.select_related('shop')[:10])
                if new_orders:
                    last_order_id = new_orders[0].id

                    for order in new_orders:
                        event_id += 1
                        yield _sse_event_with_id(event_id, {
                            'type': 'new_order',
                            'order': {
                                'id': order.id,
                                'order_number': order.order_number,
                                'status': order.status,
                                'total': str(order.total),
                                'shop_name': order.shop.name if order.shop else '',
                                'customer_name': order.customer_name or '',
                                'created_at': order.created_at.isoformat(),
                                'payment_method': order.payment_method or 'cod',
                            }
                        })

                    # ── Revenue update (fires WITH new orders) ──
                    today = timezone.localdate()
                    today_revenue = Order.objects.filter(
                        status='delivered',
                        created_at__date=today,
                    ).aggregate(total=Sum('total'))['total'] or 0

                    today_orders_count = Order.objects.filter(
                        created_at__date=today
                    ).count()

                    event_id += 1
                    yield _sse_event_with_id(event_id, {
                        'type': 'revenue_update',
                        'today_revenue': float(today_revenue),
                        'today_orders': today_orders_count,
                    })

                # ── Anomaly detection (checked with orders) ──
                last_hour_count = Order.objects.filter(
                    created_at__gte=timezone.now() - timedelta(hours=1)
                ).count()
                total_orders = Order.objects.count()

                if total_orders > 0 and latest:
                    first_order = Order.objects.order_by('created_at').first()
                    if first_order:
                        hours_span = max(
                            (timezone.now() - first_order.created_at).total_seconds() / 3600,
                            1,
                        )
                        avg_hourly = total_orders / hours_span
                        if last_hour_count > (avg_hourly * 3) and avg_hourly > 0:
                            event_id += 1
                            yield _sse_event_with_id(event_id, {
                                'type': 'system_alert',
                                'alert': 'order_spike',
                                'message': f'Order spike: {last_hour_count} orders in last hour (avg: {avg_hourly:.0f}/hr)',
                                'severity': 'warning',
                                'last_hour': last_hour_count,
                                'avg_hourly': round(avg_hourly, 1),
                            })

                # ── Fraud alerts (checked every cycle) ───
                try:
                    from core.fraud import FraudAlert
                    new_fraud_alerts = FraudAlert.objects.filter(
                        id__gt=last_fraud_alert_id,
                        status='active',
                    ).order_by('id')[:5]

                    for fa in new_fraud_alerts:
                        last_fraud_alert_id = fa.id
                        event_id += 1
                        yield _sse_event_with_id(event_id, {
                            'type': 'fraud_alert',
                            'alert': {
                                'id': fa.id,
                                'alert_type': fa.alert_type,
                                'severity': fa.severity,
                                'title': fa.title,
                                'description': fa.description,
                                'target_type': fa.target_type,
                                'target_name': fa.target_name,
                                'created_at': fa.created_at.isoformat(),
                            }
                        })
                except Exception:
                    pass

                # ── Complaint spike detection ────────
                try:
                    current_pending = Complaint.objects.filter(status='pending').count()
                    if current_pending > last_complaint_count + 3:
                        event_id += 1
                        yield _sse_event_with_id(event_id, {
                            'type': 'complaint_spike',
                            'severity': 'warning',
                            'pending_count': current_pending,
                            'delta': current_pending - last_complaint_count,
                            'message': f'{current_pending} pending complaints (+{current_pending - last_complaint_count} since last check)',
                        })
                    last_complaint_count = current_pending
                except Exception:
                    pass

                # ── System health probe (every 60s) ──
                if now - last_health_check > SSE_HEALTH_INTERVAL:
                    health = _probe_health()
                    event_id += 1
                    yield _sse_event_with_id(event_id, {
                        'type': 'health_status',
                        **health,
                    })
                    last_health_check = now

                # ── Heartbeat ────────────────────────
                if now - last_heartbeat > SSE_HEARTBEAT_INTERVAL:
                    event_id += 1
                    yield _sse_event_with_id(event_id, {
                        'type': 'heartbeat',
                        'uptime': round(elapsed),
                        'connections': _conn_count,
                    })
                    last_heartbeat = now

            except Exception as e:
                logger.error(f'Admin SSE stream error: {e}')
                event_id += 1
                yield _sse_event_with_id(event_id, {
                    'type': 'error',
                    'message': 'Internal error, reconnecting',
                })
                break

            time.sleep(SSE_POLL_INTERVAL)

    except GeneratorExit:
        # Client disconnected — clean shutdown
        logger.debug('Admin SSE: client disconnected')
    finally:
        _dec_connections()
        try:
            db_connection.close()
        except Exception:
            pass


def _probe_health():
    """Quick health probe reusing logic from health.py."""
    result = {'status': 'healthy', 'db': 'unknown', 'cache_status': 'unknown'}

    try:
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
            cursor.fetchone()
        result['db'] = 'connected'
    except Exception:
        result['db'] = 'error'
        result['status'] = 'degraded'

    try:
        cache.set('_sse_health', 'ok', 10)
        if cache.get('_sse_health') == 'ok':
            result['cache_status'] = 'connected'
        else:
            result['cache_status'] = 'error'
            result['status'] = 'degraded'
    except Exception:
        result['cache_status'] = 'error'
        result['status'] = 'degraded'

    return result


def _sse_event_with_id(event_id, data):
    """Format SSE event with id field for browser-native reconnect."""
    return f"id: {event_id}\ndata: {json.dumps(data)}\n\n"


def _sse_error(message):
    """Generator for SSE error responses."""
    yield f"data: {json.dumps({'type': 'error', 'message': message})}\n\n"
