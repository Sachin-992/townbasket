"""
Fraud Detection Engine for TownBasket Admin.

Detects anomalous patterns:
- Order spike detection (3× above hourly average)
- High cancel/refund rate customers
- Rapid sequential orders from same customer
- Unusual delivery locations
"""
import logging
from django.utils import timezone
from django.db import models
from django.db.models import Count, Sum, Q, F, Avg
from datetime import timedelta

from orders.models import Order
from users.models import User
from complaints.models import Complaint

logger = logging.getLogger('townbasket_backend')


# ────────────────────────────────────────────
# Fraud Alert Model
# ────────────────────────────────────────────
class FraudAlert(models.Model):
    """
    Detected fraud/anomaly alerts for admin review.
    """
    SEVERITY_CHOICES = [
        ('info', 'Info'),
        ('warning', 'Warning'),
        ('critical', 'Critical'),
    ]

    STATUS_CHOICES = [
        ('active', 'Active'),
        ('investigating', 'Investigating'),
        ('dismissed', 'Dismissed'),
        ('confirmed', 'Confirmed'),
    ]

    ALERT_TYPES = [
        ('order_spike', 'Order Spike'),
        ('high_cancel_rate', 'High Cancel Rate'),
        ('rapid_orders', 'Rapid Sequential Orders'),
        ('high_refund_rate', 'High Refund Rate'),
        ('suspicious_pattern', 'Suspicious Pattern'),
        ('high_complaint_ratio', 'High Complaint Ratio'),
        ('repeated_refunds', 'Repeated Refunds'),
        ('rapid_account_creation', 'Rapid Account Creation'),
    ]

    alert_type = models.CharField(max_length=30, choices=ALERT_TYPES, db_index=True)
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES, default='warning')
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='active')

    # Who/what triggered it
    target_type = models.CharField(max_length=20)  # 'user', 'order', 'system'
    target_id = models.CharField(max_length=255, blank=True, default='')
    target_name = models.CharField(max_length=255, blank=True, default='')

    # Details
    title = models.CharField(max_length=255)
    description = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)

    # Resolution
    resolved_by = models.CharField(max_length=255, blank=True, default='')
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolution_note = models.TextField(blank=True, default='')

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'fraud_alerts'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'severity', '-created_at']),
            models.Index(fields=['alert_type', '-created_at']),
            models.Index(fields=['target_type', 'target_id']),
        ]

    def __str__(self):
        return f"[{self.severity}] {self.title}"


# ────────────────────────────────────────────
# Detection Functions
# ────────────────────────────────────────────

def detect_order_spike():
    """
    Detect if the last hour's orders are 3× above the historical hourly average.
    Creates a FraudAlert if spike detected and no active alert exists.
    """
    now = timezone.now()
    last_hour_count = Order.objects.filter(
        created_at__gte=now - timedelta(hours=1)
    ).count()

    total_orders = Order.objects.count()
    if total_orders == 0:
        return None

    first_order = Order.objects.order_by('created_at').first()
    if not first_order:
        return None

    hours_of_history = max(
        (now - first_order.created_at).total_seconds() / 3600, 1
    )
    avg_hourly = total_orders / hours_of_history

    if avg_hourly > 0 and last_hour_count > (avg_hourly * 3):
        # Check if there's already an active spike alert in the last hour
        existing = FraudAlert.objects.filter(
            alert_type='order_spike',
            status='active',
            created_at__gte=now - timedelta(hours=1),
        ).exists()

        if not existing:
            alert = FraudAlert.objects.create(
                alert_type='order_spike',
                severity='warning',
                target_type='system',
                title=f'Order spike: {last_hour_count} orders in last hour',
                description=(
                    f'{last_hour_count} orders received in the last hour, '
                    f'which is {last_hour_count / avg_hourly:.1f}× the average '
                    f'of {avg_hourly:.1f}/hr.'
                ),
                metadata={
                    'last_hour_count': last_hour_count,
                    'avg_hourly': round(avg_hourly, 1),
                    'multiplier': round(last_hour_count / avg_hourly, 1),
                },
            )
            return alert
    return None


def detect_high_cancel_rate(threshold=0.3, min_orders=5):
    """
    Find customers with cancel rate above threshold (default 30%).
    Only considers users with at least min_orders total orders.
    """
    alerts_created = []
    now = timezone.now()
    since = now - timedelta(days=30)

    # Users with orders in the last 30 days
    user_stats = (
        Order.objects
        .filter(created_at__gte=since)
        .values('customer_id')
        .annotate(
            total=Count('id'),
            cancelled=Count('id', filter=Q(status='cancelled')),
        )
        .filter(total__gte=min_orders)
    )

    for stat in user_stats:
        cancel_rate = stat['cancelled'] / stat['total']
        if cancel_rate >= threshold:
            customer = User.objects.filter(id=stat['customer_id']).first()
            if not customer:
                continue

            # Skip if active alert exists for this user
            existing = FraudAlert.objects.filter(
                alert_type='high_cancel_rate',
                status__in=['active', 'investigating'],
                target_type='user',
                target_id=str(customer.id),
            ).exists()

            if not existing:
                alert = FraudAlert.objects.create(
                    alert_type='high_cancel_rate',
                    severity='warning' if cancel_rate < 0.5 else 'critical',
                    target_type='user',
                    target_id=str(customer.id),
                    target_name=customer.name or customer.phone or '',
                    title=f'High cancel rate: {cancel_rate:.0%}',
                    description=(
                        f'{customer.name or customer.phone} cancelled '
                        f'{stat["cancelled"]}/{stat["total"]} orders '
                        f'({cancel_rate:.0%}) in the last 30 days.'
                    ),
                    metadata={
                        'customer_id': customer.id,
                        'total_orders': stat['total'],
                        'cancelled_orders': stat['cancelled'],
                        'cancel_rate': round(cancel_rate, 3),
                    },
                )
                alerts_created.append(alert)

    return alerts_created


def detect_rapid_orders(window_minutes=5, max_orders=3):
    """
    Detect customers placing more than max_orders within window_minutes.
    """
    alerts_created = []
    now = timezone.now()
    window_start = now - timedelta(minutes=window_minutes)

    rapid_users = (
        Order.objects
        .filter(created_at__gte=window_start)
        .values('customer_id')
        .annotate(count=Count('id'))
        .filter(count__gt=max_orders)
    )

    for entry in rapid_users:
        customer = User.objects.filter(id=entry['customer_id']).first()
        if not customer:
            continue

        existing = FraudAlert.objects.filter(
            alert_type='rapid_orders',
            status='active',
            target_type='user',
            target_id=str(customer.id),
            created_at__gte=window_start,
        ).exists()

        if not existing:
            alert = FraudAlert.objects.create(
                alert_type='rapid_orders',
                severity='critical',
                target_type='user',
                target_id=str(customer.id),
                target_name=customer.name or customer.phone or '',
                title=f'Rapid orders: {entry["count"]} in {window_minutes}min',
                description=(
                    f'{customer.name or customer.phone} placed '
                    f'{entry["count"]} orders in the last {window_minutes} minutes.'
                ),
                metadata={
                    'customer_id': customer.id,
                    'order_count': entry['count'],
                    'window_minutes': window_minutes,
                },
            )
            alerts_created.append(alert)

    return alerts_created


# ────────────────────────────────────────────
# Risk Score Computation
# ────────────────────────────────────────────

def compute_risk_score(alert):
    """
    Compute a 0–100 risk score based on severity, alert type, and metadata.
    Stores result in alert.metadata['risk_score'].
    """
    score = 0

    # Base score from severity
    severity_weights = {'critical': 40, 'warning': 25, 'info': 10}
    score += severity_weights.get(alert.severity, 10)

    # Alert type weight
    type_weights = {
        'order_spike': 15,
        'high_cancel_rate': 20,
        'rapid_orders': 25,
        'high_complaint_ratio': 20,
        'repeated_refunds': 25,
        'rapid_account_creation': 15,
        'high_refund_rate': 20,
        'suspicious_pattern': 20,
    }
    score += type_weights.get(alert.alert_type, 10)

    # Contextual boost from metadata
    meta = alert.metadata or {}
    if 'cancel_rate' in meta:
        score += min(int(meta['cancel_rate'] * 30), 25)  # up to +25
    if 'multiplier' in meta:
        score += min(int(meta['multiplier'] * 3), 20)  # up to +20
    if 'order_count' in meta:
        score += min(meta['order_count'] * 2, 15)  # up to +15
    if 'complaint_ratio' in meta:
        score += min(int(meta['complaint_ratio'] * 25), 20)  # up to +20
    if 'refund_count' in meta:
        score += min(meta['refund_count'] * 3, 15)  # up to +15
    if 'account_count' in meta:
        score += min(meta['account_count'] * 2, 15)  # up to +15

    score = min(score, 100)

    # Persist
    alert.metadata['risk_score'] = score
    alert.save(update_fields=['metadata'])
    return score


# ────────────────────────────────────────────
# Complaint Ratio Detection
# ────────────────────────────────────────────

def detect_high_complaint_ratio(threshold=0.25, min_orders=3):
    """
    Find users whose complaint-to-order ratio exceeds threshold in the last 30 days.
    """
    alerts_created = []
    now = timezone.now()
    since = now - timedelta(days=30)

    # Get users with orders in last 30 days
    user_orders = (
        Order.objects
        .filter(created_at__gte=since)
        .values('customer_id')
        .annotate(total=Count('id'))
        .filter(total__gte=min_orders)
    )

    for stat in user_orders:
        customer = User.objects.filter(id=stat['customer_id']).first()
        if not customer:
            continue

        complaint_count = Complaint.objects.filter(
            user_supabase_uid=customer.supabase_uid,
            created_at__gte=since,
        ).count()

        if complaint_count == 0:
            continue

        ratio = complaint_count / stat['total']
        if ratio >= threshold:
            existing = FraudAlert.objects.filter(
                alert_type='high_complaint_ratio',
                status__in=['active', 'investigating'],
                target_type='user',
                target_id=str(customer.id),
            ).exists()

            if not existing:
                alert = FraudAlert.objects.create(
                    alert_type='high_complaint_ratio',
                    severity='warning' if ratio < 0.5 else 'critical',
                    target_type='user',
                    target_id=str(customer.id),
                    target_name=customer.name or customer.phone or '',
                    title=f'High complaint ratio: {ratio:.0%}',
                    description=(
                        f'{customer.name or customer.phone} filed '
                        f'{complaint_count} complaints across {stat["total"]} orders '
                        f'({ratio:.0%}) in the last 30 days.'
                    ),
                    metadata={
                        'customer_id': customer.id,
                        'total_orders': stat['total'],
                        'complaint_count': complaint_count,
                        'complaint_ratio': round(ratio, 3),
                    },
                )
                alerts_created.append(alert)

    return alerts_created


# ────────────────────────────────────────────
# Repeated Refund Detection
# ────────────────────────────────────────────

def detect_repeated_refunds(threshold=3, days=30):
    """
    Detect users with >= threshold refunded orders in the given window.
    """
    alerts_created = []
    now = timezone.now()
    since = now - timedelta(days=days)

    refund_users = (
        Order.objects
        .filter(created_at__gte=since, payment_status='refunded')
        .values('customer_id')
        .annotate(refund_count=Count('id'))
        .filter(refund_count__gte=threshold)
    )

    for entry in refund_users:
        customer = User.objects.filter(id=entry['customer_id']).first()
        if not customer:
            continue

        existing = FraudAlert.objects.filter(
            alert_type='repeated_refunds',
            status__in=['active', 'investigating'],
            target_type='user',
            target_id=str(customer.id),
        ).exists()

        if not existing:
            sev = 'critical' if entry['refund_count'] >= 6 else 'warning'
            alert = FraudAlert.objects.create(
                alert_type='repeated_refunds',
                severity=sev,
                target_type='user',
                target_id=str(customer.id),
                target_name=customer.name or customer.phone or '',
                title=f'Repeated refunds: {entry["refund_count"]} in {days}d',
                description=(
                    f'{customer.name or customer.phone} had '
                    f'{entry["refund_count"]} refunded orders in the last {days} days.'
                ),
                metadata={
                    'customer_id': customer.id,
                    'refund_count': entry['refund_count'],
                    'window_days': days,
                },
            )
            alerts_created.append(alert)

    return alerts_created


# ────────────────────────────────────────────
# Rapid Account Creation Detection
# ────────────────────────────────────────────

def detect_rapid_account_creation(window_hours=1, threshold=5):
    """
    System-level alert when >= threshold accounts created within window_hours.
    """
    now = timezone.now()
    window_start = now - timedelta(hours=window_hours)

    new_accounts = User.objects.filter(created_at__gte=window_start).count()

    if new_accounts >= threshold:
        existing = FraudAlert.objects.filter(
            alert_type='rapid_account_creation',
            status='active',
            created_at__gte=window_start,
        ).exists()

        if not existing:
            alert = FraudAlert.objects.create(
                alert_type='rapid_account_creation',
                severity='warning' if new_accounts < 10 else 'critical',
                target_type='system',
                title=f'Rapid signups: {new_accounts} in {window_hours}h',
                description=(
                    f'{new_accounts} new accounts created in the last '
                    f'{window_hours} hour{"s" if window_hours != 1 else ""}. '
                    f'Threshold is {threshold}.'
                ),
                metadata={
                    'account_count': new_accounts,
                    'window_hours': window_hours,
                    'threshold': threshold,
                },
            )
            return alert
    return None


# ────────────────────────────────────────────
# Run All Detections
# ────────────────────────────────────────────

def run_all_detections():
    """Run all fraud detection checks and attach risk scores."""
    results = {
        'order_spike': detect_order_spike(),
        'high_cancel_rate': detect_high_cancel_rate(),
        'rapid_orders': detect_rapid_orders(),
        'high_complaint_ratio': detect_high_complaint_ratio(),
        'repeated_refunds': detect_repeated_refunds(),
        'rapid_account_creation': detect_rapid_account_creation(),
    }

    # Attach risk scores to all newly created alerts
    for key, value in results.items():
        if value is None:
            continue
        if isinstance(value, list):
            for alert in value:
                compute_risk_score(alert)
        else:
            compute_risk_score(value)

    return results
