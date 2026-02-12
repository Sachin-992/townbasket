"""
Server-Sent Events (SSE) endpoint for admin real-time feed.

Streams:
  - new_order: All new orders across all shops
  - revenue_tick: Running revenue total every 30s
  - system_alert: Anomaly / spike alerts
  - heartbeat: Every 10s

Usage:
  GET /api/admin/sse/
  Authorization: Bearer <token>
"""
import json
import time
import logging
from django.http import StreamingHttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Sum
from django.utils import timezone
from datetime import timedelta

from orders.models import Order
from townbasket_backend.middleware import get_supabase_user
from users.models import User

logger = logging.getLogger('townbasket_backend')

SSE_POLL_INTERVAL = 5          # seconds between polls
SSE_HEARTBEAT_INTERVAL = 10    # seconds between heartbeats
SSE_MAX_DURATION = 600         # 10 minutes max connection


@csrf_exempt
def admin_sse(request):
    """
    Admin-only SSE stream for real-time dashboard updates.
    """
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

    response = StreamingHttpResponse(
        _admin_stream(),
        content_type='text/event-stream',
    )
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no'
    return response


def _admin_stream():
    """Generator yielding SSE events for the admin dashboard."""
    start_time = time.time()
    last_heartbeat = time.time()
    last_revenue_tick = time.time()
    last_order_id = None

    # Baseline: latest order ID
    latest = Order.objects.order_by('-id').first()
    if latest:
        last_order_id = latest.id

    # Send connected event
    yield _sse_event({'type': 'connected'})

    while True:
        elapsed = time.time() - start_time
        if elapsed > SSE_MAX_DURATION:
            yield _sse_event({'type': 'timeout', 'message': 'Connection expired, please reconnect'})
            break

        now = time.time()

        try:
            # ── New orders ────────────────────────
            new_orders_qs = Order.objects.order_by('-id')
            if last_order_id:
                new_orders_qs = new_orders_qs.filter(id__gt=last_order_id)

            new_orders = list(new_orders_qs[:10])
            if new_orders:
                last_order_id = new_orders[0].id
                for order in new_orders:
                    yield _sse_event({
                        'type': 'new_order',
                        'order': {
                            'id': order.id,
                            'order_number': order.order_number,
                            'status': order.status,
                            'total': str(order.total),
                            'shop_name': order.shop.name if order.shop else '',
                            'customer_name': order.customer_name or '',
                            'created_at': order.created_at.isoformat(),
                        }
                    })

            # ── Revenue tick every 30s ────────────
            if now - last_revenue_tick > 30:
                today = timezone.localdate()
                today_revenue = Order.objects.filter(
                    status='delivered',
                    created_at__date=today,
                ).aggregate(total=Sum('total'))['total'] or 0

                today_orders = Order.objects.filter(created_at__date=today).count()

                yield _sse_event({
                    'type': 'revenue_tick',
                    'today_revenue': float(today_revenue),
                    'today_orders': today_orders,
                })
                last_revenue_tick = now

            # ── Anomaly detection ─────────────────
            last_hour_count = Order.objects.filter(
                created_at__gte=timezone.now() - timedelta(hours=1)
            ).count()
            total_orders = Order.objects.count()
            if total_orders > 0 and latest:
                hours_since_start = max(
                    (timezone.now() - Order.objects.order_by('created_at').first().created_at).total_seconds() / 3600,
                    1,
                )
                avg_hourly = total_orders / hours_since_start
                if last_hour_count > (avg_hourly * 3) and avg_hourly > 0:
                    yield _sse_event({
                        'type': 'system_alert',
                        'alert': 'order_spike',
                        'message': f'Order spike detected: {last_hour_count} orders in last hour (avg: {avg_hourly:.0f}/hr)',
                        'last_hour': last_hour_count,
                        'avg_hourly': round(avg_hourly, 1),
                    })

            # ── Heartbeat ─────────────────────────
            if now - last_heartbeat > SSE_HEARTBEAT_INTERVAL:
                yield _sse_event({'type': 'heartbeat', 'uptime': round(elapsed)})
                last_heartbeat = now

        except Exception as e:
            logger.error(f'Admin SSE stream error: {e}')
            yield _sse_event({'type': 'error', 'message': 'Internal error'})
            break

        time.sleep(SSE_POLL_INTERVAL)


def _sse_event(data):
    """Format data as an SSE event string."""
    return f"data: {json.dumps(data)}\n\n"


def _sse_error(message):
    """Generator for SSE error responses."""
    yield f"data: {json.dumps({'type': 'error', 'message': message})}\n\n"
