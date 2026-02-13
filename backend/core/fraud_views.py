"""
Fraud Alert API endpoints for the Operational Intelligence Control Center.

Endpoints:
  - GET  /admin/fraud/alerts/             — List active fraud alerts
  - POST /admin/fraud/alerts/<id>/dismiss/ — Dismiss an alert
  - POST /admin/fraud/alerts/<id>/investigate/ — Mark for investigation
  - POST /admin/fraud/alerts/<id>/confirm/ — Confirm as fraud
  - GET  /admin/fraud/high-risk-users/    — Users with high cancel/refund rates
  - GET  /admin/fraud/summary/            — Fraud summary stats
  - POST /admin/fraud/scan/              — Trigger manual fraud scan
"""
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone

from townbasket_backend.middleware import require_auth, require_role
from .fraud import FraudAlert, run_all_detections
from .admin_views import log_admin_action
from .rate_limit import rate_limit
from orders.models import Order
from users.models import User
from django.db.models import Count, Q
from datetime import timedelta


# ────────────────────────────────────────────
# List Fraud Alerts
# ────────────────────────────────────────────
@api_view(['GET'])
@require_auth
@require_role('admin')
@rate_limit(max_requests=60, window_seconds=60, key_prefix='admin_fraud')
def fraud_alerts(request):
    """List fraud alerts with optional status/severity/type filters."""
    alert_status = request.GET.get('status', 'active')
    severity = request.GET.get('severity')
    alert_type = request.GET.get('type')
    page = max(1, int(request.GET.get('page', 1)))
    size = 20
    offset = (page - 1) * size

    qs = FraudAlert.objects.all()

    if alert_status and alert_status != 'all':
        qs = qs.filter(status=alert_status)
    if severity:
        qs = qs.filter(severity=severity)
    if alert_type:
        qs = qs.filter(alert_type=alert_type)

    total = qs.count()
    alerts = qs[offset:offset + size]

    return Response({
        'results': [
            {
                'id': a.id,
                'alert_type': a.alert_type,
                'severity': a.severity,
                'status': a.status,
                'target_type': a.target_type,
                'target_id': a.target_id,
                'target_name': a.target_name,
                'title': a.title,
                'description': a.description,
                'metadata': a.metadata,
                'risk_score': (a.metadata or {}).get('risk_score', 0),
                'resolved_by': a.resolved_by,
                'resolved_at': a.resolved_at.isoformat() if a.resolved_at else None,
                'resolution_note': a.resolution_note,
                'created_at': a.created_at.isoformat(),
            }
            for a in alerts
        ],
        'total': total,
        'page': page,
        'pages': (total + size - 1) // size,
        'active_count': FraudAlert.objects.filter(status='active').count(),
        'critical_count': FraudAlert.objects.filter(
            status='active', severity='critical'
        ).count(),
    })


# ────────────────────────────────────────────
# Dismiss Alert
# ────────────────────────────────────────────
@api_view(['POST'])
@require_auth
@require_role('admin')
@rate_limit(max_requests=30, window_seconds=60, key_prefix='admin_fraud_action')
def dismiss_alert(request, alert_id):
    """Dismiss a fraud alert."""
    try:
        alert = FraudAlert.objects.get(id=alert_id)
    except FraudAlert.DoesNotExist:
        return Response(
            {'error': 'Alert not found'},
            status=status.HTTP_404_NOT_FOUND,
        )

    note = request.data.get('note', '')
    user = getattr(request, 'supabase_user', {})

    alert.status = 'dismissed'
    alert.resolved_by = user.get('sub', '')
    alert.resolved_at = timezone.now()
    alert.resolution_note = note
    alert.save()

    log_admin_action(
        request, 'fraud_alert_dismiss', 'fraud_alert', alert.id,
        details={'alert_type': alert.alert_type, 'note': note}
    )

    return Response({'status': 'dismissed', 'id': alert.id})


# ────────────────────────────────────────────
# Investigate Alert
# ────────────────────────────────────────────
@api_view(['POST'])
@require_auth
@require_role('admin')
@rate_limit(max_requests=30, window_seconds=60, key_prefix='admin_fraud_action')
def investigate_alert(request, alert_id):
    """Mark a fraud alert for investigation."""
    try:
        alert = FraudAlert.objects.get(id=alert_id)
    except FraudAlert.DoesNotExist:
        return Response(
            {'error': 'Alert not found'},
            status=status.HTTP_404_NOT_FOUND,
        )

    note = request.data.get('note', '')
    user = getattr(request, 'supabase_user', {})

    alert.status = 'investigating'
    alert.resolved_by = user.get('sub', '')
    alert.resolution_note = note
    alert.save()

    log_admin_action(
        request, 'fraud_alert_investigate', 'fraud_alert', alert.id,
        details={'alert_type': alert.alert_type, 'note': note}
    )

    return Response({'status': 'investigating', 'id': alert.id})


# ────────────────────────────────────────────
# High-Risk Users
# ────────────────────────────────────────────
@api_view(['GET'])
@require_auth
@require_role('admin')
@rate_limit(max_requests=20, window_seconds=60, key_prefix='admin_fraud')
def high_risk_users(request):
    """Users with high cancel/refund rates in the last 30 days."""
    since = timezone.localdate() - timedelta(days=30)
    min_orders = int(request.GET.get('min_orders', 3))

    users = (
        User.objects
        .filter(role='customer')
        .annotate(
            recent_orders=Count(
                'orders',
                filter=Q(orders__created_at__date__gte=since),
            ),
            cancelled=Count(
                'orders',
                filter=Q(
                    orders__status='cancelled',
                    orders__created_at__date__gte=since,
                ),
            ),
        )
        .filter(recent_orders__gte=min_orders)
        .order_by('-cancelled')
    )

    high_risk = []
    for u in users:
        cancel_rate = u.cancelled / u.recent_orders if u.recent_orders > 0 else 0
        if cancel_rate >= 0.25:  # 25%+ cancel rate
            high_risk.append({
                'id': u.id,
                'name': u.name or u.phone or 'Unknown',
                'phone': u.phone or '',
                'email': u.email or '',
                'recent_orders': u.recent_orders,
                'cancelled': u.cancelled,
                'cancel_rate': round(cancel_rate * 100, 1),
                'is_active': u.is_active,
                'risk_level': (
                    'critical' if cancel_rate >= 0.5
                    else 'high' if cancel_rate >= 0.35
                    else 'medium'
                ),
            })

    return Response({
        'users': high_risk[:30],
        'total': len(high_risk),
    })


# ────────────────────────────────────────────
# Manual Fraud Scan
# ────────────────────────────────────────────
@api_view(['POST'])
@require_auth
@require_role('admin')
@rate_limit(max_requests=5, window_seconds=300, key_prefix='admin_fraud_scan')
def fraud_scan(request):
    """Trigger a manual fraud detection scan."""
    results = run_all_detections()

    new_alerts = 0
    if results.get('order_spike'):
        new_alerts += 1
    if results.get('high_cancel_rate'):
        new_alerts += len(results['high_cancel_rate'])
    if results.get('rapid_orders'):
        new_alerts += len(results['rapid_orders'])

    return Response({
        'scan_complete': True,
        'new_alerts': new_alerts,
        'details': {
            'order_spike': bool(results.get('order_spike')),
            'high_cancel_rate': len(results.get('high_cancel_rate', [])),
            'rapid_orders': len(results.get('rapid_orders', [])),
            'high_complaint_ratio': len(results.get('high_complaint_ratio', [])),
            'repeated_refunds': len(results.get('repeated_refunds', [])),
            'rapid_account_creation': bool(results.get('rapid_account_creation')),
        },
    })


# ────────────────────────────────────────────
# Confirm Alert
# ────────────────────────────────────────────
@api_view(['POST'])
@require_auth
@require_role('admin')
@rate_limit(max_requests=30, window_seconds=60, key_prefix='admin_fraud_action')
def confirm_alert(request, alert_id):
    """Confirm a fraud alert as genuine fraud."""
    try:
        alert = FraudAlert.objects.get(id=alert_id)
    except FraudAlert.DoesNotExist:
        return Response(
            {'error': 'Alert not found'},
            status=status.HTTP_404_NOT_FOUND,
        )

    note = request.data.get('note', '')
    user = getattr(request, 'supabase_user', {})

    alert.status = 'confirmed'
    alert.resolved_by = user.get('sub', '')
    alert.resolved_at = timezone.now()
    alert.resolution_note = note
    alert.save()

    log_admin_action(
        request, 'fraud_alert_confirm', 'fraud_alert', alert.id,
        details={'alert_type': alert.alert_type, 'note': note}
    )

    return Response({'status': 'confirmed', 'id': alert.id})


# ────────────────────────────────────────────
# Fraud Summary
# ────────────────────────────────────────────
@api_view(['GET'])
@require_auth
@require_role('admin')
@rate_limit(max_requests=60, window_seconds=60, key_prefix='admin_fraud_summary')
def fraud_summary(request):
    """Overview stats for the fraud intelligence panel."""
    from django.db.models import Avg

    active_alerts = FraudAlert.objects.filter(status='active')
    total_active = active_alerts.count()
    critical_count = active_alerts.filter(severity='critical').count()

    # Average risk score from metadata
    scores = [
        (a.metadata or {}).get('risk_score', 0)
        for a in active_alerts.only('metadata')
    ]
    avg_risk_score = round(sum(scores) / len(scores), 1) if scores else 0

    # Breakdown by type
    by_type = dict(
        active_alerts
        .values_list('alert_type')
        .annotate(count=Count('id'))
        .values_list('alert_type', 'count')
    )

    # Breakdown by severity
    by_severity = dict(
        active_alerts
        .values_list('severity')
        .annotate(count=Count('id'))
        .values_list('severity', 'count')
    )

    return Response({
        'total_active': total_active,
        'critical_count': critical_count,
        'avg_risk_score': avg_risk_score,
        'by_type': by_type,
        'by_severity': by_severity,
    })
