"""
Admin-specific views for the Control Center.
Analytics, audit logs, system health, and activity feed.
"""
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.http import StreamingHttpResponse
from django.utils import timezone
from django.db.models import Sum, Count, Q, F, Avg, ExpressionWrapper, DurationField
from django.db.models.functions import TruncDate, TruncWeek, TruncMonth
from datetime import timedelta
import logging

from townbasket_backend.middleware import require_auth, require_role
from orders.models import Order
from shops.models import Shop
from users.models import User
from complaints.models import Complaint
from core.rate_limit import rate_limit
from core.cache_utils import analytics_cache, with_circuit_breaker, overview_circuit, analytics_circuit
from .audit import AuditLog
from .fraud import FraudAlert
from .rate_limit import suspicious_activity_check

logger = logging.getLogger('townbasket_backend')


# ────────────────────────────────────────────
# Overview
# ────────────────────────────────────────────
@api_view(['GET'])
@require_auth
@require_role('admin')
@rate_limit(max_requests=60, window_seconds=60, key_prefix='admin_analytics')
def admin_overview(request):
    """
    Intelligent Overview Panel — cached 60s.
    Returns revenue (today/week/month), growth %, fulfillment rate,
    complaint ratio, avg delivery time, conversion rate, active sellers,
    7-day sparkline data for revenue & orders, and fraud alert counts.
    """
    from django.core.cache import cache as django_cache
    from django.db.models import Avg, ExpressionWrapper, DurationField

    cache_key = 'admin:overview:v2'
    cached = django_cache.get(cache_key)
    if cached:
        return Response(cached)

    now = timezone.now()
    today = timezone.localdate()
    yesterday = today - timedelta(days=1)
    d7 = today - timedelta(days=7)
    d14 = today - timedelta(days=14)
    d30 = today - timedelta(days=30)
    d60 = today - timedelta(days=60)
    week_start = today - timedelta(days=today.weekday())
    month_start = today.replace(day=1)

    orders = Order.objects.all()
    delivered = orders.filter(status='delivered')

    # ── Revenue: today / week / month ────────────
    rev_today = float(delivered.filter(created_at__date=today).aggregate(t=Sum('total'))['t'] or 0)
    rev_yesterday = float(delivered.filter(created_at__date=yesterday).aggregate(t=Sum('total'))['t'] or 0)
    rev_week = float(delivered.filter(created_at__date__gte=week_start).aggregate(t=Sum('total'))['t'] or 0)
    rev_month = float(delivered.filter(created_at__date__gte=month_start).aggregate(t=Sum('total'))['t'] or 0)
    rev_last30 = float(delivered.filter(created_at__date__gte=d30).aggregate(t=Sum('total'))['t'] or 0)
    rev_prev30 = float(delivered.filter(created_at__date__gte=d60, created_at__date__lt=d30).aggregate(t=Sum('total'))['t'] or 0)
    total_revenue = float(delivered.aggregate(t=Sum('total'))['t'] or 0)

    # Revenue growth %
    rev_growth = round(((rev_last30 - rev_prev30) / rev_prev30 * 100), 1) if rev_prev30 > 0 else 0

    # ── Orders ───────────────────────────────────
    today_orders = orders.filter(created_at__date=today).count()
    yesterday_orders = orders.filter(created_at__date=yesterday).count()
    total_orders = orders.count()
    delivered_count = delivered.count()

    # ── Fulfillment Rate ─────────────────────────
    fulfillment_rate = round((delivered_count / total_orders * 100), 1) if total_orders > 0 else 0

    # ── Conversion Rate (confirmed+preparing+ready+delivered / total) ──
    converting_statuses = ['confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered']
    converted = orders.filter(status__in=converting_statuses).count()
    conversion_rate = round((converted / total_orders * 100), 1) if total_orders > 0 else 0

    # ── Complaint Ratio (complaints / total orders) ──
    total_complaints = Complaint.objects.count()
    pending_complaints = Complaint.objects.filter(status='pending').count()
    complaint_ratio = round((total_complaints / total_orders * 100), 2) if total_orders > 0 else 0

    # ── Avg Delivery Time (delivered_at - confirmed_at) ──
    avg_delivery_qs = delivered.filter(
        delivered_at__isnull=False,
        confirmed_at__isnull=False,
    ).annotate(
        delivery_duration=ExpressionWrapper(
            F('delivered_at') - F('confirmed_at'),
            output_field=DurationField()
        )
    ).aggregate(avg_time=Avg('delivery_duration'))
    avg_delivery_seconds = avg_delivery_qs['avg_time'].total_seconds() if avg_delivery_qs['avg_time'] else 0
    avg_delivery_minutes = round(avg_delivery_seconds / 60, 0)

    # ── Active Sellers ───────────────────────────
    active_sellers = Shop.objects.filter(status='approved', is_active=True).count()
    pending_shops = Shop.objects.filter(status='pending').count()

    # Sellers with orders in last 7 days
    active_selling_7d = (
        orders.filter(created_at__date__gte=d7)
        .values('shop_id').distinct().count()
    )

    # ── Users ────────────────────────────────────
    total_users = User.objects.count()
    new_users_today = User.objects.filter(created_at__date=today).count()
    new_users_7d = User.objects.filter(created_at__date__gte=d7).count()

    # ── 7-Day Sparkline Data (SINGLE QUERY) ────
    sparkline_qs = (
        Order.objects
        .filter(created_at__date__gte=d7)
        .annotate(day=TruncDate('created_at'))
        .values('day')
        .annotate(
            revenue=Sum('total', filter=Q(status='delivered')),
            order_count=Count('id'),
        )
        .order_by('day')
    )
    sparkline_map = {row['day']: row for row in sparkline_qs}
    sparkline_days = []
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        row = sparkline_map.get(d, {})
        sparkline_days.append({
            'date': d.isoformat(),
            'revenue': float(row.get('revenue') or 0),
            'orders': row.get('order_count', 0),
        })

    # ── Anomaly Detection ────────────────────────
    last_hour = orders.filter(created_at__gte=now - timedelta(hours=1)).count()
    avg_hourly = 0
    if orders.exists():
        first_order = orders.order_by('created_at').first()
        if first_order:
            hours_span = max((now - first_order.created_at).total_seconds() / 3600, 1)
            avg_hourly = total_orders / hours_span
    anomaly_flag = last_hour > (avg_hourly * 3) if avg_hourly > 0 else False

    # ── Fraud Alerts ─────────────────────────────
    try:
        active_fraud_alerts = FraudAlert.objects.filter(status='active').count()
        critical_fraud_alerts = FraudAlert.objects.filter(status='active', severity='critical').count()
    except Exception:
        active_fraud_alerts = 0
        critical_fraud_alerts = 0

    payload = {
        # Revenue breakdown
        'revenueToday': rev_today,
        'revenueYesterday': rev_yesterday,
        'revenueWeek': rev_week,
        'revenueMonth': rev_month,
        'totalRevenue': total_revenue,
        'revenueGrowth': rev_growth,
        'prevRevenue': rev_prev30,

        # Orders
        'todayOrders': today_orders,
        'yesterdayOrders': yesterday_orders,
        'totalOrders': total_orders,

        # Intelligence metrics
        'fulfillmentRate': fulfillment_rate,
        'conversionRate': conversion_rate,
        'complaintRatio': complaint_ratio,
        'avgDeliveryMinutes': avg_delivery_minutes,

        # Sellers
        'activeSellers': active_sellers,
        'activeSelling7d': active_selling_7d,
        'pendingShops': pending_shops,

        # Users
        'totalUsers': total_users,
        'newUsersToday': new_users_today,
        'newUsers7d': new_users_7d,

        # Complaints
        'pendingComplaints': pending_complaints,

        # Sparklines (7 days)
        'sparkline': sparkline_days,

        # Anomaly & Fraud
        'anomalyFlag': anomaly_flag,
        'fraudAlerts': active_fraud_alerts,
        'criticalFraudAlerts': critical_fraud_alerts,
    }

    django_cache.set(cache_key, payload, timeout=60)
    return Response(payload)


# ────────────────────────────────────────────
# Revenue Analytics
# ────────────────────────────────────────────
@api_view(['GET'])
@require_auth
@require_role('admin')
@rate_limit(max_requests=60, window_seconds=60, key_prefix='admin_analytics')
@analytics_cache(timeout=120, key_prefix='revenue')
@with_circuit_breaker(analytics_circuit)
def revenue_analytics(request):
    """Revenue time series: daily, weekly, or monthly."""
    period = request.GET.get('period', 'daily')
    if period not in ('daily', 'weekly', 'monthly'):
        period = 'daily'
    days = {'daily': 30, 'weekly': 90, 'monthly': 365}[period]
    since = timezone.localdate() - timedelta(days=days)

    trunc_fn = {'daily': TruncDate, 'weekly': TruncWeek, 'monthly': TruncMonth}[period]

    series = (
        Order.objects
        .filter(status='delivered', created_at__date__gte=since)
        .annotate(date=trunc_fn('created_at'))
        .values('date')
        .annotate(
            revenue=Sum('total'),
            orders=Count('id'),
        )
        .order_by('date')
    )

    return Response({
        'period': period,
        'series': [
            {
                'date': str(entry['date']),
                'revenue': float(entry['revenue'] or 0),
                'orders': entry['orders'],
            }
            for entry in series
        ],
    })


# ────────────────────────────────────────────
# User Growth
# ────────────────────────────────────────────
@api_view(['GET'])
@require_auth
@require_role('admin')
@rate_limit(max_requests=60, window_seconds=60, key_prefix='admin_analytics')
@analytics_cache(timeout=120, key_prefix='user_growth')
@with_circuit_breaker(analytics_circuit)
def user_growth(request):
    """User registration over time by role."""
    since = timezone.localdate() - timedelta(days=90)

    series = (
        User.objects
        .filter(created_at__date__gte=since)
        .annotate(date=TruncDate('created_at'))
        .values('date', 'role')
        .annotate(count=Count('id'))
        .order_by('date')
    )

    return Response({
        'series': [
            {'date': str(e['date']), 'role': e['role'], 'count': e['count']}
            for e in series
        ]
    })


# ────────────────────────────────────────────
# System Health
# ────────────────────────────────────────────
@api_view(['GET'])
@require_auth
@require_role('admin')
@rate_limit(max_requests=30, window_seconds=60, key_prefix='admin_health')
def system_health(request):
    """Check DB, cache, and auth system status."""
    health = {'database': True, 'cache': True, 'auth': True}

    # DB check
    try:
        User.objects.first()
    except Exception:
        health['database'] = False

    # Cache check (Redis) — graceful
    try:
        from django.core.cache import cache
        cache.set('_health_check', 1, 5)
        health['cache'] = cache.get('_health_check') == 1
    except Exception:
        health['cache'] = False

    return Response(health)


# ────────────────────────────────────────────
# Activity Feed
# ────────────────────────────────────────────
@api_view(['GET'])
@require_auth
@require_role('admin')
@rate_limit(max_requests=60, window_seconds=60, key_prefix='admin_analytics')
def activity_feed(request):
    """Recent audit log entries as activity feed."""
    page = max(1, int(request.GET.get('page', 1)))
    size = 20
    offset = (page - 1) * size

    logs = AuditLog.objects.all()[offset:offset + size]
    total = AuditLog.objects.count()

    return Response({
        'results': [
            {
                'id': log.id,
                'admin_name': log.admin_name,
                'action': log.action,
                'target_type': log.target_type,
                'target_id': log.target_id,
                'details': log.details,
                'ip_address': log.ip_address,
                'created_at': log.created_at.isoformat(),
            }
            for log in logs
        ],
        'total': total,
        'page': page,
        'pages': (total + size - 1) // size,
    })


# ────────────────────────────────────────────
# Audit Logs
# ────────────────────────────────────────────
@api_view(['GET'])
@require_auth
@require_role('admin')
@rate_limit(max_requests=60, window_seconds=60, key_prefix='admin_analytics')
def audit_logs(request):
    """Paginated audit logs with optional filters."""
    page = max(1, int(request.GET.get('page', 1)))
    size = 20
    offset = (page - 1) * size

    qs = AuditLog.objects.all()

    action_filter = request.GET.get('action')
    if action_filter:
        qs = qs.filter(action=action_filter)

    admin_filter = request.GET.get('admin_uid')
    if admin_filter:
        qs = qs.filter(admin_uid=admin_filter)

    admin_name_filter = request.GET.get('admin_name')
    if admin_name_filter:
        qs = qs.filter(admin_name__icontains=admin_name_filter)

    risk_filter = request.GET.get('risk_level')
    if risk_filter:
        qs = qs.filter(risk_level=risk_filter)

    # Cursor-based pagination (optional)
    cursor = request.GET.get('cursor')
    if cursor:
        try:
            qs = qs.filter(id__lt=int(cursor))
        except (ValueError, TypeError):
            pass

    total = qs.count()
    logs = qs[offset:offset + size]

    # Get next cursor
    last_log = list(logs)[-1] if logs else None
    next_cursor = last_log.id if last_log else None

    return Response({
        'results': [
            {
                'id': log.id,
                'admin_name': log.admin_name,
                'admin_uid': log.admin_uid,
                'action': log.action,
                'target_type': log.target_type,
                'target_id': log.target_id,
                'details': log.details,
                'ip_address': log.ip_address,
                'risk_level': log.risk_level,
                'session_id': log.session_id,
                'created_at': log.created_at.isoformat(),
            }
            for log in logs
        ],
        'total': total,
        'page': page,
        'pages': (total + size - 1) // size,
        'next_cursor': next_cursor,
    })


# ────────────────────────────────────────────
# Helper: Create an audit log entry
# ────────────────────────────────────────────
# Risk level mapping for different action types
ACTION_RISK_MAP = {
    'settings_update': 'medium',
    'user_toggle': 'medium',
    'order_override': 'medium',
    'refund_approve': 'high',
    'invoice_resend': 'low',
    'fraud_user_ban': 'high',
    'fraud_alert_dismiss': 'low',
    'fraud_alert_investigate': 'medium',
    'fraud_alert_confirm': 'high',
    'bulk_shop_approve': 'medium',
    'bulk_shop_reject': 'medium',
    'bulk_user_toggle': 'high',
    'permission_change': 'critical',
    'audit_export': 'medium',
}


def log_admin_action(request, action, target_type, target_id, details=None):
    """Utility to create an AuditLog entry from any admin view."""
    user = getattr(request, 'supabase_user', {})
    ip = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR', ''))
    if ',' in ip:
        ip = ip.split(',')[0].strip()

    try:
        from users.models import User as TBUser
        admin = TBUser.objects.filter(supabase_uid=user.get('sub', '')).first()
        admin_name = admin.name or admin.email or admin.phone or '' if admin else ''
    except Exception:
        admin_name = ''

    # Determine risk level
    risk_level = ACTION_RISK_MAP.get(action, 'low')

    # Extract session and user agent
    session_id = request.META.get('HTTP_X_SESSION_ID', '')
    user_agent = request.META.get('HTTP_USER_AGENT', '')

    AuditLog.objects.create(
        admin_uid=user.get('sub', ''),
        admin_name=admin_name,
        action=action,
        target_type=target_type,
        target_id=str(target_id),
        details=details or {},
        ip_address=ip or None,
        risk_level=risk_level,
        session_id=session_id,
        user_agent=user_agent[:500] if user_agent else '',
    )

    # Check for suspicious volume of admin actions
    suspicious_activity_check(request, action)


# ────────────────────────────────────────────
# Shops Stats (cached 60s)
# ────────────────────────────────────────────
@api_view(['GET'])
@require_auth
@require_role('admin')
@rate_limit(max_requests=60, window_seconds=60, key_prefix='admin_shops_stats')
def admin_shops_stats(request):
    """Aggregated shop/seller metrics — cached 60s."""
    from django.core.cache import cache as django_cache

    cache_key = 'admin:shops:stats:v1'
    cached = django_cache.get(cache_key)
    if cached:
        return Response(cached)

    today = timezone.localdate()
    d7 = today - timedelta(days=7)
    d30 = today - timedelta(days=30)

    all_shops = Shop.objects.all()
    total = all_shops.count()
    active = all_shops.filter(status='approved', is_active=True).count()
    pending = all_shops.filter(status='pending').count()
    rejected = all_shops.filter(status='rejected').count()
    new_7d = all_shops.filter(created_at__date__gte=d7).count()

    # Top revenue sellers (last 30 days)
    top_sellers = (
        Order.objects.filter(status='delivered', created_at__date__gte=d30)
        .values('shop__name', 'shop_id')
        .annotate(
            revenue=Sum('total'),
            order_count=Count('id'),
        )
        .order_by('-revenue')[:5]
    )

    payload = {
        'total': total,
        'active': active,
        'pending': pending,
        'rejected': rejected,
        'new7d': new_7d,
        'topSellers': [
            {
                'name': s['shop__name'],
                'shopId': s['shop_id'],
                'revenue': float(s['revenue'] or 0),
                'orders': s['order_count'],
            }
            for s in top_sellers
        ],
    }

    django_cache.set(cache_key, payload, timeout=60)
    return Response(payload)


# ────────────────────────────────────────────
# Orders Stats (cached 60s)
# ────────────────────────────────────────────
@api_view(['GET'])
@require_auth
@require_role('admin')
@rate_limit(max_requests=60, window_seconds=60, key_prefix='admin_orders_stats')
def admin_orders_stats(request):
    """Aggregated order metrics — cached 60s."""
    from django.core.cache import cache as django_cache

    cache_key = 'admin:orders:stats:v1'
    cached = django_cache.get(cache_key)
    if cached:
        return Response(cached)

    today = timezone.localdate()
    d30 = today - timedelta(days=30)

    orders = Order.objects.all()
    total = orders.count()

    # Status breakdown
    status_counts = {}
    for status_name in ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled']:
        status_counts[status_name] = orders.filter(status=status_name).count()

    delivered = orders.filter(status='delivered')
    delivered_count = delivered.count()
    total_revenue = float(delivered.aggregate(t=Sum('total'))['t'] or 0)
    avg_order = round(total_revenue / delivered_count, 2) if delivered_count > 0 else 0

    # Revenue last 30 days
    rev_30d = float(
        delivered.filter(created_at__date__gte=d30).aggregate(t=Sum('total'))['t'] or 0
    )

    # Payment method split
    payment_split = {}
    for pm in ['cod', 'upi', 'online']:
        payment_split[pm] = orders.filter(payment_method=pm).count()

    payload = {
        'total': total,
        'statusBreakdown': status_counts,
        'delivered': delivered_count,
        'totalRevenue': total_revenue,
        'revenue30d': rev_30d,
        'avgOrderValue': avg_order,
        'paymentSplit': payment_split,
    }

    django_cache.set(cache_key, payload, timeout=60)
    return Response(payload)


# ────────────────────────────────────────────
# Audit CSV Export
# ────────────────────────────────────────────
@api_view(['GET'])
@require_auth
@require_role('admin')
@rate_limit(max_requests=5, window_seconds=300, key_prefix='admin_export')
def export_audit_csv(request):
    """Export audit logs as CSV. Supports the same filters as audit_logs."""
    import csv
    from django.http import HttpResponse

    qs = AuditLog.objects.all()

    action_filter = request.GET.get('action')
    if action_filter:
        qs = qs.filter(action=action_filter)
    admin_filter = request.GET.get('admin_uid')
    if admin_filter:
        qs = qs.filter(admin_uid=admin_filter)
    admin_name_filter = request.GET.get('admin_name')
    if admin_name_filter:
        qs = qs.filter(admin_name__icontains=admin_name_filter)
    risk_filter = request.GET.get('risk_level')
    if risk_filter:
        qs = qs.filter(risk_level=risk_filter)

    # Cap at 5000 rows to prevent abuse — use iterator() for memory efficiency
    logs_qs = qs.order_by('-created_at')[:5000]

    response = StreamingHttpResponse(
        _csv_stream_generator(logs_qs),
        content_type='text/csv',
    )
    response['Content-Disposition'] = 'attachment; filename="audit-log.csv"'

    # Log the export itself
    log_admin_action(request, 'audit_export', 'audit_log', 0, {
        'filters': {
            'action': action_filter,
            'admin_uid': admin_filter,
            'risk_level': risk_filter,
        },
    })

    return response


def _csv_stream_generator(queryset):
    """Stream CSV rows one at a time using iterator() — O(1) memory."""
    import csv
    import io

    # Header
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow([
        'ID', 'Timestamp', 'Admin Name', 'Admin UID', 'Action',
        'Target Type', 'Target ID', 'Risk Level', 'Details',
    ])
    yield buf.getvalue()

    # Data rows — iterator() avoids loading all rows into memory
    for log in queryset.iterator(chunk_size=500):
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow([
            log.id,
            log.created_at.isoformat(),
            log.admin_name,
            log.admin_uid,
            log.action,
            log.target_type,
            log.target_id,
            log.risk_level,
            str(log.details) if log.details else '',
        ])
        yield buf.getvalue()


# ────────────────────────────────────────────
# Distinct Admin Users (for filter dropdown)
# ────────────────────────────────────────────
@api_view(['GET'])
@require_auth
@require_role('admin')
@rate_limit(max_requests=60, window_seconds=60, key_prefix='admin_audit')
def audit_admin_list(request):
    """Return distinct admin users who have audit entries."""
    admins = (
        AuditLog.objects
        .values('admin_uid', 'admin_name')
        .distinct()
        .order_by('admin_name')[:50]
    )
    return Response({
        'admins': [
            {'uid': a['admin_uid'], 'name': a['admin_name'] or a['admin_uid'][:8]}
            for a in admins if a['admin_uid']
        ]
    })


# ────────────────────────────────────────────
# Quick Search (Command Palette)
# ────────────────────────────────────────────
@api_view(['GET'])
@require_auth
@require_role('admin')
@rate_limit(max_requests=120, window_seconds=60, key_prefix='admin_search')
def admin_quick_search(request):
    """
    Search across users, shops, and orders for the command palette.
    Returns max 5 results per entity type.
    """
    q = request.GET.get('q', '').strip()
    if len(q) < 2:
        return Response({'users': [], 'shops': [], 'orders': []})

    # ── Users (name, email, phone) ──
    users_qs = User.objects.filter(
        Q(name__icontains=q) | Q(email__icontains=q) | Q(phone__icontains=q)
    )[:5]
    users = [
        {
            'id': u.id,
            'name': u.name or u.email or u.phone or '',
            'email': u.email or '',
            'phone': u.phone or '',
            'role': u.role,
            'is_active': u.is_active,
        }
        for u in users_qs
    ]

    # ── Shops (name) ──
    shops_qs = Shop.objects.filter(name__icontains=q)[:5]
    shops = [
        {
            'id': s.id,
            'name': s.name,
            'status': s.status,
            'is_active': s.is_active,
        }
        for s in shops_qs
    ]

    # ── Orders (order_number) ──
    orders_qs = Order.objects.filter(
        Q(order_number__icontains=q)
    ).select_related('shop')[:5]
    orders = [
        {
            'id': o.id,
            'order_number': o.order_number,
            'status': o.status,
            'total': float(o.total),
            'shop_name': o.shop.name if o.shop else '',
        }
        for o in orders_qs
    ]

    return Response({'users': users, 'shops': shops, 'orders': orders})
