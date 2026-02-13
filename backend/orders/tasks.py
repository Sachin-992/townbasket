"""
Celery tasks for async invoice processing.

Tasks:
- generate_and_send_invoice: Generate PDF + send email (non-blocking)

Graceful degradation: if Celery broker unavailable, falls back to sync execution.
"""
import logging
from celery import shared_task

logger = logging.getLogger('townbasket_backend')


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=30,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=300,
    name='orders.generate_and_send_invoice',
)
def generate_and_send_invoice(self, order_id):
    """
    Async task: Generate invoice PDF and send via email.

    Retries up to 3 times with exponential backoff on failure.
    """
    from orders.services.invoice_service import generate_invoice
    from orders.services.email_service import send_invoice_email

    try:
        logger.info(f'[Task] Generating invoice for order {order_id}')
        invoice = generate_invoice(order_id)

        if invoice and invoice.status == 'generated':
            logger.info(f'[Task] Sending invoice email for {invoice.invoice_number}')
            send_invoice_email(invoice)

        return {
            'invoice_number': invoice.invoice_number if invoice else None,
            'status': invoice.status if invoice else 'failed',
        }

    except Exception as exc:
        logger.error(f'[Task] Invoice generation failed for order {order_id}: {exc}')
        raise self.retry(exc=exc)


def trigger_invoice_generation(order_id):
    """
    Trigger invoice generation — async via Celery if available,
    synchronous fallback otherwise.

    Call this from the order status update view.
    """
    try:
        # Try async (Celery)
        result = generate_and_send_invoice.delay(order_id)
        logger.info(f'Invoice task queued for order {order_id}: {result.id}')
    except Exception as e:
        # Celery broker not available — run synchronously
        logger.warning(f'Celery unavailable ({e}). Running invoice generation synchronously.')
        try:
            from orders.services.invoice_service import generate_invoice
            from orders.services.email_service import send_invoice_email

            invoice = generate_invoice(order_id)
            if invoice and invoice.status == 'generated':
                send_invoice_email(invoice)
        except Exception as sync_exc:
            logger.error(f'Sync invoice generation failed for order {order_id}: {sync_exc}')
