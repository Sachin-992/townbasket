"""
Pre-aggregated metrics model + Celery periodic task.
─────────────────────────────────────────────────────
AdminMetricsDaily: pre-computed daily metrics so the dashboard
reads from a small table instead of running live aggregations
across 100K+ row tables.

Celery beat task `refresh_admin_metrics` runs every 5 minutes and
updates today's row (plus backfills yesterday if missing).
"""
from django.db import models
from django.utils import timezone
from datetime import timedelta


class AdminMetricsDaily(models.Model):
    """
    Pre-computed daily admin metrics.
    One row per day. Updated every 5 minutes for today's row.
    """
    date = models.DateField(unique=True, db_index=True)

    # Revenue
    revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    revenue_delivered = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # Orders
    order_count = models.IntegerField(default=0)
    delivered_count = models.IntegerField(default=0)
    cancelled_count = models.IntegerField(default=0)

    # Users
    new_users = models.IntegerField(default=0)
    active_customers = models.IntegerField(default=0)

    # Delivery
    avg_delivery_minutes = models.FloatField(default=0)

    # Complaints
    complaints_total = models.IntegerField(default=0)
    complaints_pending = models.IntegerField(default=0)

    # Shops
    active_shops = models.IntegerField(default=0)
    shops_with_orders = models.IntegerField(default=0)

    # Timestamp
    computed_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'admin_metrics_daily'
        ordering = ['-date']
        indexes = [
            models.Index(fields=['-date'], name='idx_metrics_date_desc'),
        ]

    def __str__(self):
        return f"Metrics {self.date}: {self.order_count} orders, ₹{self.revenue_delivered}"

    @classmethod
    def compute_for_date(cls, target_date):
        """
        Compute metrics for a specific date and upsert.
        Uses efficient aggregates — runs 6 queries total.
        """
        from orders.models import Order
        from users.models import User
        from shops.models import Shop
        from complaints.models import Complaint
        from django.db.models import Sum, Count, Avg, F, ExpressionWrapper, DurationField, Q

        orders_qs = Order.objects.filter(created_at__date=target_date)
        delivered_qs = orders_qs.filter(status='delivered')

        # 1. Order aggregates (1 query)
        order_agg = orders_qs.aggregate(
            total=Count('id'),
            delivered=Count('id', filter=Q(status='delivered')),
            cancelled=Count('id', filter=Q(status='cancelled')),
            revenue=Sum('total'),
            revenue_delivered=Sum('total', filter=Q(status='delivered')),
        )

        # 2. Avg delivery time (1 query)
        avg_delivery = delivered_qs.filter(
            delivered_at__isnull=False,
            confirmed_at__isnull=False,
        ).annotate(
            duration=ExpressionWrapper(
                F('delivered_at') - F('confirmed_at'),
                output_field=DurationField()
            )
        ).aggregate(avg=Avg('duration'))
        avg_minutes = 0
        if avg_delivery['avg']:
            avg_minutes = round(avg_delivery['avg'].total_seconds() / 60, 1)

        # 3. Users (1 query)
        new_users = User.objects.filter(created_at__date=target_date).count()
        active_customers = (
            orders_qs.values('customer_id').distinct().count()
        )

        # 4. Complaints (1 query)
        complaints = Complaint.objects.filter(created_at__date=target_date)
        complaints_total = complaints.count()
        complaints_pending = complaints.filter(status='pending').count()

        # 5. Shops (1 query)
        active_shops = Shop.objects.filter(status='approved', is_active=True).count()
        shops_with_orders = orders_qs.values('shop_id').distinct().count()

        # 6. Upsert (1 query)
        obj, _ = cls.objects.update_or_create(
            date=target_date,
            defaults={
                'revenue': order_agg['revenue'] or 0,
                'revenue_delivered': order_agg['revenue_delivered'] or 0,
                'order_count': order_agg['total'] or 0,
                'delivered_count': order_agg['delivered'] or 0,
                'cancelled_count': order_agg['cancelled'] or 0,
                'new_users': new_users,
                'active_customers': active_customers,
                'avg_delivery_minutes': avg_minutes,
                'complaints_total': complaints_total,
                'complaints_pending': complaints_pending,
                'active_shops': active_shops,
                'shops_with_orders': shops_with_orders,
            }
        )
        return obj
