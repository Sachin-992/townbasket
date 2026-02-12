"""
Admin-specific views for the Control Center.
Analytics, audit logs, system health, and activity feed.
"""
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Sum, Count, Q, F
from django.db.models.functions import TruncDate, TruncWeek, TruncMonth
from datetime import timedelta
import logging

from townbasket_backend.middleware import require_auth, require_role
from orders.models import Order
from shops.models import Shop
from users.models import User
from complaints.models import Complaint
from .audit import AuditLog
from .rate_limit import rate_limit, suspicious_activity_check

logger = logging.getLogger('townbasket_backend')


# ────────────────────────────────────────────
# Overview
# ────────────────────────────────────────────
@api_view(['GET'])
@require_auth
@require_role('admin')
@rate_limit(max_requests=60, window_seconds=60, key_prefix='admin_analytics')
def admin_overview(request):
    """Aggregated dashboard overview."""
    today = timezone.localdate()
    yesterday = today - timedelta(days=1)

    orders = Order.objects.all()
    today_orders = orders.filter(created_at__date=today).count()
    yesterday_orders = orders.filter(created_at__date=yesterday).count()

    delivered = orders.filter(status='delivered')
    total_revenue = delivered.aggregate(total=Sum('total'))['total'] or 0

    # Previous period revenue (last 30 days vs prior 30 days)
    d30 = today - timedelta(days=30)
    d60 = today - timedelta(days=60)
    rev_current = delivered.filter(created_at__date__gte=d30).aggregate(t=Sum('total'))['t'] or 0
    rev_previous = delivered.filter(created_at__date__gte=d60, created_at__date__lt=d30).aggregate(t=Sum('total'))['t'] or 0

    total_orders = orders.count()
    delivered_count = delivered.count()
    fulfillment_rate = (delivered_count / total_orders * 100) if total_orders > 0 else 0

    total_shops = Shop.objects.filter(status='approved', is_active=True).count()
    pending_shops = Shop.objects.filter(status='pending').count()

    total_users = User.objects.count()
    new_users_today = User.objects.filter(created_at__date=today).count()

    pending_complaints = Complaint.objects.filter(status='pending').count()

    # Anomaly detection: order spike
    last_hour = orders.filter(created_at__gte=timezone.now() - timedelta(hours=1)).count()
    avg_hourly = total_orders / max((timezone.now() - orders.order_by('created_at').first().created_at).total_seconds() / 3600, 1) if orders.exists() else 0
    anomaly_flag = last_hour > (avg_hourly * 3) if avg_hourly > 0 else False

    return Response({
        'totalRevenue': float(total_revenue),
        'prevRevenue': float(rev_previous),
        'todayOrders': today_orders,
        'yesterdayOrders': yesterday_orders,
        'totalOrders': total_orders,
        'fulfillmentRate': round(fulfillment_rate, 1),
        'activeSellers': total_shops,
        'pendingShops': pending_shops,
        'totalShops': total_shops,
        'totalUsers': total_users,
        'newUsersToday': new_users_today,
        'pendingComplaints': pending_complaints,
        'anomalyFlag': anomaly_flag,
    })


# ────────────────────────────────────────────
# Revenue Analytics
# ────────────────────────────────────────────
@api_view(['GET'])
@require_auth
@require_role('admin')
@rate_limit(max_requests=60, window_seconds=60, key_prefix='admin_analytics')
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

    total = qs.count()
    logs = qs[offset:offset + size]

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
                'created_at': log.created_at.isoformat(),
            }
            for log in logs
        ],
        'total': total,
        'page': page,
        'pages': (total + size - 1) // size,
    })


# ────────────────────────────────────────────
# Helper: Create an audit log entry
# ────────────────────────────────────────────
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

    AuditLog.objects.create(
        admin_uid=user.get('sub', ''),
        admin_name=admin_name,
        action=action,
        target_type=target_type,
        target_id=str(target_id),
        details=details or {},
        ip_address=ip or None,
    )

    # Check for suspicious volume of admin actions
    suspicious_activity_check(request, action)

