"""
Email service for sending invoice PDFs.

Sends invoice email to:
- Customer email (from Order.customer → User.email)
- Admin email (from settings.ADMIN_EMAIL)

Features:
- PDF attachment
- Retry logic (3 attempts)
- Status tracking
"""
import logging
import os
import time

from django.core.mail import EmailMessage
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger('townbasket_backend')


def _get_pdf_bytes(invoice):
    """Retrieve PDF bytes from Supabase Storage or local file."""
    pdf_path = invoice.pdf_path

    # Local file
    if pdf_path.startswith('local:'):
        local_path = pdf_path.replace('local:', '')
        if os.path.exists(local_path):
            with open(local_path, 'rb') as f:
                return f.read()
        logger.error(f'Local PDF not found: {local_path}')
        return None

    # Supabase Storage
    try:
        from supabase import create_client
        supabase_url = settings.SUPABASE_URL
        supabase_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', settings.SUPABASE_ANON_KEY)

        if not supabase_url or not supabase_key:
            logger.error('Supabase credentials not configured for PDF download')
            return None

        client = create_client(supabase_url, supabase_key)
        response = client.storage.from_('invoices').download(pdf_path)
        return response

    except Exception as e:
        logger.error(f'Failed to download PDF from Supabase: {e}')
        return None


def send_invoice_email(invoice, max_retries=3):
    """
    Send invoice email to customer and admin.

    Args:
        invoice: Invoice model instance
        max_retries: Number of retry attempts on failure

    Returns:
        bool: True if sent successfully, False otherwise
    """
    order = invoice.order

    # Get customer email
    customer_email = None
    if order.customer and order.customer.email:
        customer_email = order.customer.email
    elif hasattr(order, 'customer_supabase_uid') and order.customer_supabase_uid:
        from users.models import User
        try:
            user = User.objects.get(supabase_uid=order.customer_supabase_uid)
            customer_email = user.email
        except User.DoesNotExist:
            pass

    admin_email = getattr(settings, 'ADMIN_EMAIL', None)

    recipients = []
    if customer_email:
        recipients.append(customer_email)
    if admin_email:
        recipients.append(admin_email)

    if not recipients:
        logger.warning(
            f'No email recipients for invoice {invoice.invoice_number}. '
            f'Customer email: {customer_email}, Admin email: {admin_email}'
        )
        invoice.status = 'failed'
        invoice.save(update_fields=['status', 'updated_at'])
        return False

    # Get PDF bytes
    pdf_bytes = _get_pdf_bytes(invoice)
    if not pdf_bytes:
        logger.error(f'Cannot send email: PDF not available for invoice {invoice.invoice_number}')
        invoice.status = 'failed'
        invoice.save(update_fields=['status', 'updated_at'])
        return False

    # Compose email
    subject = f'TownBasket Invoice – Order #{order.order_number}'
    body = (
        f'Dear {order.customer_name},\n\n'
        f'Thank you for your order!\n\n'
        f'Order Summary:\n'
        f'  Order Number: {order.order_number}\n'
        f'  Invoice Number: {invoice.invoice_number}\n'
        f'  Total Amount: ₹{invoice.total_amount:.2f}\n'
        f'  Status: Delivered\n\n'
        f'Your invoice is attached as a PDF document.\n\n'
        f'If you have any questions, please contact our support team.\n\n'
        f'Best regards,\n'
        f'TownBasket Team\n'
        f'TN24 AGRIFRESH'
    )

    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@townbasket.in')

    # Retry logic
    for attempt in range(1, max_retries + 1):
        try:
            email = EmailMessage(
                subject=subject,
                body=body,
                from_email=from_email,
                to=recipients,
            )
            email.attach(
                f'Invoice_{invoice.invoice_number}.pdf',
                pdf_bytes,
                'application/pdf'
            )
            email.send(fail_silently=False)

            # Update invoice status
            invoice.status = 'sent'
            invoice.email_sent_at = timezone.now()
            invoice.save(update_fields=['status', 'email_sent_at', 'updated_at'])

            logger.info(
                f'Invoice email sent: {invoice.invoice_number} → {recipients} '
                f'(attempt {attempt})'
            )
            return True

        except Exception as e:
            logger.warning(
                f'Email send failed for {invoice.invoice_number} '
                f'(attempt {attempt}/{max_retries}): {e}'
            )
            if attempt < max_retries:
                time.sleep(2 ** attempt)  # Exponential backoff: 2s, 4s, 8s

    # All retries exhausted
    invoice.status = 'failed'
    invoice.save(update_fields=['status', 'updated_at'])
    logger.error(f'Invoice email FAILED after {max_retries} attempts: {invoice.invoice_number}')
    return False
