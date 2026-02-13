"""
Advanced Analytics API endpoints for the Operational Intelligence Control Center.

Endpoints:
  - /admin/analytics/top-products/    — Top 10 products by revenue
  - /admin/analytics/top-shops/       — Shop performance leaderboard
  - /admin/analytics/peak-hours/      — Hourly order distribution
  - /admin/analytics/conversion-funnel/ — Conversion funnel metrics
  - /admin/analytics/clv/             — Customer lifetime value
  - /admin/analytics/delivery-efficiency/ — Delivery partner metrics
"""
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Count, Sum, Avg, Q, F, Min, Max
from django.db.models.functions import ExtractHour, ExtractWeekDay, TruncDate
from datetime import timedelta

from townbasket_backend.middleware import require_auth, require_role
from orders.models import Order, OrderItem
from shops.models import Shop
from users.models import User
from .rate_limit import rate_limit
from .cache_utils import analytics_cache, with_circuit_breaker, analytics_circuit


# ────────────────────────────────────────────
# Top Products
# ────────────────────────────────────────────
@api_view(['GET'])
@require_auth
@require_role('admin')
@rate_limit(max_requests=30, window_seconds=60, key_prefix='admin_analytics')
@analytics_cache(timeout=120, key_prefix='top_products')
@with_circuit_breaker(analytics_circuit)
def top_products(request):
    """Top 10 products by revenue or order count."""
    days = int(request.GET.get('days', 30))
    sort_by = request.GET.get('sort', 'revenue')  # 'revenue' or 'orders'
    since = timezone.localdate() - timedelta(days=days)

    qs = (
        OrderItem.objects
        .filter(
            order__status='delivered',
            order__created_at__date__gte=since,
        )
        .values('product_name')
        .annotate(
            total_revenue=Sum('total_price'),
            total_quantity=Sum('quantity'),
            order_count=Count('order_id', distinct=True),
        )
    )

    if sort_by == 'orders':
        qs = qs.order_by('-order_count')
    else:
        qs = qs.order_by('-total_revenue')

    return Response({
        'period_days': days,
        'products': [
            {
                'name': p['product_name'],
                'revenue': float(p['total_revenue'] or 0),
                'quantity': p['total_quantity'],
                'orders': p['order_count'],
            }
            for p in qs[:10]
        ],
    })


# ────────────────────────────────────────────
# Top Shops (Leaderboard)
# ────────────────────────────────────────────
@api_view(['GET'])
@require_auth
@require_role('admin')
@rate_limit(max_requests=30, window_seconds=60, key_prefix='admin_analytics')
@analytics_cache(timeout=120, key_prefix='top_shops')
@with_circuit_breaker(analytics_circuit)
def top_shops(request):
    """Shop performance leaderboard."""
    days = int(request.GET.get('days', 30))
    since = timezone.localdate() - timedelta(days=days)

    shops = (
        Shop.objects
        .select_related('category')
        .filter(status='approved')
        .annotate(
            total_revenue=Sum(
                'orders__total',
                filter=Q(
                    orders__status='delivered',
                    orders__created_at__date__gte=since,
                ),
            ),
            total_orders=Count(
                'orders',
                filter=Q(orders__created_at__date__gte=since),
            ),
            delivered_orders=Count(
                'orders',
                filter=Q(
                    orders__status='delivered',
                    orders__created_at__date__gte=since,
                ),
            ),
            cancelled_orders=Count(
                'orders',
                filter=Q(
                    orders__status='cancelled',
                    orders__created_at__date__gte=since,
                ),
            ),
        )
        .filter(total_orders__gt=0)
        .order_by('-total_revenue')
        [:15]
    )

    return Response({
        'period_days': days,
        'shops': [
            {
                'id': s.id,
                'name': s.name,
                'town': s.town,
                'category': s.category.name if s.category else '',
                'revenue': float(s.total_revenue or 0),
                'orders': s.total_orders,
                'delivered': s.delivered_orders,
                'cancelled': s.cancelled_orders,
                'fulfillment_rate': (
                    round(s.delivered_orders / s.total_orders * 100, 1)
                    if s.total_orders > 0 else 0
                ),
                'rating': float(s.average_rating),
            }
            for s in shops
        ],
    })


# ────────────────────────────────────────────
# Peak Hours
# ────────────────────────────────────────────
@api_view(['GET'])
@require_auth
@require_role('admin')
@rate_limit(max_requests=30, window_seconds=60, key_prefix='admin_analytics')
@analytics_cache(timeout=120, key_prefix='peak_hours')
@with_circuit_breaker(analytics_circuit)
def peak_hours(request):
    """Hourly order distribution for heatmap."""
    days = int(request.GET.get('days', 30))
    since = timezone.localdate() - timedelta(days=days)

    # Hour × Day-of-week heatmap data
    heatmap = (
        Order.objects
        .filter(created_at__date__gte=since)
        .annotate(
            hour=ExtractHour('created_at'),
            weekday=ExtractWeekDay('created_at'),
        )
        .values('hour', 'weekday')
        .annotate(count=Count('id'))
        .order_by('weekday', 'hour')
    )

    # Also get simple hourly distribution
    hourly = (
        Order.objects
        .filter(created_at__date__gte=since)
        .annotate(hour=ExtractHour('created_at'))
        .values('hour')
        .annotate(
            count=Count('id'),
            revenue=Sum('total', filter=Q(status='delivered')),
        )
        .order_by('hour')
    )

    return Response({
        'period_days': days,
        'heatmap': [
            {
                'hour': h['hour'],
                'weekday': h['weekday'],
                'orders': h['count'],
            }
            for h in heatmap
        ],
        'hourly': [
            {
                'hour': h['hour'],
                'orders': h['count'],
                'revenue': float(h['revenue'] or 0),
            }
            for h in hourly
        ],
    })


# ────────────────────────────────────────────
# Conversion Funnel
# ────────────────────────────────────────────
@api_view(['GET'])
@require_auth
@require_role('admin')
@rate_limit(max_requests=30, window_seconds=60, key_prefix='admin_analytics')
@analytics_cache(timeout=120, key_prefix='funnel')
@with_circuit_breaker(analytics_circuit)
def conversion_funnel(request):
    """Order status funnel: pending → confirmed → delivered."""
    days = int(request.GET.get('days', 30))
    since = timezone.localdate() - timedelta(days=days)

    orders = Order.objects.filter(created_at__date__gte=since)
    total = orders.count()

    status_counts = (
        orders.values('status')
        .annotate(count=Count('id'))
    )
    counts = {s['status']: s['count'] for s in status_counts}

    completed = counts.get('delivered', 0)
    confirmed = completed + counts.get('preparing', 0) + counts.get('ready', 0) + counts.get('out_for_delivery', 0)
    placed = total

    return Response({
        'period_days': days,
        'funnel': [
            {'stage': 'Orders Placed', 'count': placed, 'rate': 100},
            {
                'stage': 'Confirmed',
                'count': confirmed,
                'rate': round(confirmed / placed * 100, 1) if placed > 0 else 0,
            },
            {
                'stage': 'Delivered',
                'count': completed,
                'rate': round(completed / placed * 100, 1) if placed > 0 else 0,
            },
        ],
        'status_breakdown': counts,
        'cancel_rate': round(
            counts.get('cancelled', 0) / total * 100, 1
        ) if total > 0 else 0,
    })


# ────────────────────────────────────────────
# Customer Lifetime Value
# ────────────────────────────────────────────
@api_view(['GET'])
@require_auth
@require_role('admin')
@rate_limit(max_requests=20, window_seconds=60, key_prefix='admin_analytics')
@analytics_cache(timeout=120, key_prefix='clv')
@with_circuit_breaker(analytics_circuit)
def customer_lifetime_value(request):
    """Top customers by lifetime value and order frequency."""
    limit = min(int(request.GET.get('limit', 20)), 50)

    customers = (
        User.objects
        .filter(role='customer')
        .annotate(
            order_count=Count('orders', filter=Q(orders__status='delivered')),
            total_spent=Sum('orders__total', filter=Q(orders__status='delivered')),
            first_order=Min('orders__created_at'),
            last_order=Max('orders__created_at'),
            avg_order_value=Avg('orders__total', filter=Q(orders__status='delivered')),
            cancelled_count=Count('orders', filter=Q(orders__status='cancelled')),
        )
        .filter(order_count__gt=0)
        .order_by('-total_spent')
        [:limit]
    )

    return Response({
        'customers': [
            {
                'id': c.id,
                'name': c.name or c.phone or 'Unknown',
                'phone': c.phone or '',
                'order_count': c.order_count,
                'total_spent': float(c.total_spent or 0),
                'avg_order': float(c.avg_order_value or 0),
                'first_order': c.first_order.isoformat() if c.first_order else None,
                'last_order': c.last_order.isoformat() if c.last_order else None,
                'cancelled': c.cancelled_count,
                'reward_points': c.reward_points,
            }
            for c in customers
        ],
    })


# ────────────────────────────────────────────
# Delivery Efficiency
# ────────────────────────────────────────────
@api_view(['GET'])
@require_auth
@require_role('admin')
@rate_limit(max_requests=30, window_seconds=60, key_prefix='admin_analytics')
@analytics_cache(timeout=120, key_prefix='delivery_eff')
@with_circuit_breaker(analytics_circuit)
def delivery_efficiency(request):
    """Delivery partner performance metrics."""
    days = int(request.GET.get('days', 30))
    since = timezone.localdate() - timedelta(days=days)

    partners = (
        User.objects
        .filter(role='delivery', is_enrolled=True)
        .annotate(
            total_deliveries=Count(
                'deliveries',
                filter=Q(deliveries__created_at__date__gte=since),
            ),
            completed_deliveries=Count(
                'deliveries',
                filter=Q(
                    deliveries__status='delivered',
                    deliveries__created_at__date__gte=since,
                ),
            ),
            total_revenue=Sum(
                'deliveries__total',
                filter=Q(
                    deliveries__status='delivered',
                    deliveries__created_at__date__gte=since,
                ),
            ),
            avg_delivery_value=Avg(
                'deliveries__total',
                filter=Q(
                    deliveries__status='delivered',
                    deliveries__created_at__date__gte=since,
                ),
            ),
        )
        .order_by('-completed_deliveries')
        [:30]
    )

    return Response({
        'period_days': days,
        'partners': [
            {
                'id': p.id,
                'name': p.name or p.phone or 'Unknown',
                'phone': p.phone or '',
                'is_online': p.is_online,
                'total_deliveries': p.total_deliveries,
                'completed': p.completed_deliveries,
                'success_rate': (
                    round(p.completed_deliveries / p.total_deliveries * 100, 1)
                    if p.total_deliveries > 0 else 0
                ),
                'revenue_handled': float(p.total_revenue or 0),
                'avg_delivery_value': float(p.avg_delivery_value or 0),
            }
            for p in partners
        ],
        'summary': {
            'total_partners': partners.count(),
            'online_now': partners.filter(is_online=True).count(),
        },
    })
