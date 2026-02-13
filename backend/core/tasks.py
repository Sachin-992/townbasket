"""
Celery periodic tasks for admin metrics pre-computation.
─────────────────────────────────────────────────────────
Schedule `refresh_admin_metrics` every 5 minutes via Celery Beat.

To add to beat schedule in settings.py:
    CELERY_BEAT_SCHEDULE = {
        'refresh-admin-metrics': {
            'task': 'core.tasks.refresh_admin_metrics',
            'schedule': 300,  # 5 minutes
        },
    }
"""
import logging
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger('townbasket_backend')


@shared_task(bind=True, max_retries=2, default_retry_delay=30)
def refresh_admin_metrics(self):
    """
    Pre-compute admin dashboard metrics.
    - Always refreshes today's row (data is live-ish).
    - Backfills yesterday if it hasn't been computed yet.
    - On failure, retries up to 2 times with 30s delay.
    """
    from core.metrics import AdminMetricsDaily

    try:
        today = timezone.localdate()
        yesterday = today - timedelta(days=1)

        # Always update today (data changes constantly)
        AdminMetricsDaily.compute_for_date(today)
        logger.info(f'Admin metrics refreshed for {today}')

        # Backfill yesterday if missing or stale (>2 hours old)
        try:
            yd = AdminMetricsDaily.objects.get(date=yesterday)
            staleness = (timezone.now() - yd.computed_at).total_seconds()
            if staleness > 7200:  # 2 hours
                AdminMetricsDaily.compute_for_date(yesterday)
                logger.info(f'Admin metrics backfilled for {yesterday}')
        except AdminMetricsDaily.DoesNotExist:
            AdminMetricsDaily.compute_for_date(yesterday)
            logger.info(f'Admin metrics backfilled for {yesterday}')

    except Exception as exc:
        logger.error(f'Admin metrics refresh failed: {exc}')
        raise self.retry(exc=exc)


@shared_task
def backfill_admin_metrics(days=30):
    """
    One-time backfill task to populate historical metrics.
    Usage: backfill_admin_metrics.delay(days=90)
    """
    from core.metrics import AdminMetricsDaily

    today = timezone.localdate()
    for i in range(days):
        target = today - timedelta(days=i)
        try:
            AdminMetricsDaily.compute_for_date(target)
            logger.info(f'Backfilled metrics for {target}')
        except Exception as e:
            logger.error(f'Backfill failed for {target}: {e}')
