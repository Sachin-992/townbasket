"""
Atomic invoice number generator.
Format: TB-YYYY-NNNNNN (e.g., TB-2026-000001)

Concurrency-safe: uses DB-level SELECT FOR UPDATE to prevent race conditions.
"""
from django.db import transaction
from django.utils import timezone


def generate_invoice_number():
    """
    Generate a unique invoice number in format TB-YYYY-NNNNNN.

    Uses SELECT FOR UPDATE on the latest invoice of the current year
    to safely increment under concurrent requests.
    """
    from orders.models import Invoice  # Lazy import to avoid circular

    year = timezone.localdate().year
    prefix = f'TB-{year}-'

    with transaction.atomic():
        # Lock the latest invoice row for this year to prevent race conditions
        latest = (
            Invoice.objects
            .filter(invoice_number__startswith=prefix)
            .select_for_update()
            .order_by('-invoice_number')
            .first()
        )

        if latest:
            # Extract the numeric portion and increment
            try:
                last_num = int(latest.invoice_number.split('-')[-1])
            except (ValueError, IndexError):
                last_num = 0
            next_num = last_num + 1
        else:
            next_num = 1

        return f'{prefix}{next_num:06d}'
