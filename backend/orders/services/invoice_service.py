"""
Invoice Generation Service.

Generates professional PDF invoices for delivered orders:
1. Fetch order data
2. Calculate totals (subtotal, delivery, GST, grand total)
3. Render HTML template → PDF
4. Upload PDF to Supabase Storage
5. Save Invoice record

Idempotent: returns existing invoice if already generated.
Wrapped in transaction.atomic() for data integrity.
"""
import logging
import tempfile
import os
from decimal import Decimal

from django.db import transaction
from django.template.loader import render_to_string
from django.utils import timezone
from django.conf import settings

from orders.models import Order, Invoice
from orders.utils.invoice_number import generate_invoice_number

logger = logging.getLogger('townbasket_backend')


def _number_to_words_indian(number):
    """Convert a number to Indian English words (e.g., 145 → 'One Hundred Forty Five')."""
    ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
            'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
            'Seventeen', 'Eighteen', 'Nineteen']
    tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

    if number == 0:
        return 'Zero'

    def _two_digits(n):
        if n < 20:
            return ones[n]
        return (tens[n // 10] + ' ' + ones[n % 10]).strip()

    def _three_digits(n):
        if n >= 100:
            return ones[n // 100] + ' Hundred ' + _two_digits(n % 100)
        return _two_digits(n)

    num = int(number)
    if num < 0:
        return 'Minus ' + _number_to_words_indian(-num)

    # Indian numbering: crores, lakhs, thousands, hundreds
    parts = []
    if num >= 10000000:
        parts.append(_two_digits(num // 10000000) + ' Crore')
        num %= 10000000
    if num >= 100000:
        parts.append(_two_digits(num // 100000) + ' Lakh')
        num %= 100000
    if num >= 1000:
        parts.append(_two_digits(num // 1000) + ' Thousand')
        num %= 1000
    if num > 0:
        parts.append(_three_digits(num))

    return ' '.join(parts).strip()


def amount_in_words(amount):
    """Convert amount to 'One Hundred Forty Five Rupees Only'."""
    rupees = int(amount)
    paise = int(round((amount - rupees) * 100))

    words = _number_to_words_indian(rupees) + ' Rupees'
    if paise > 0:
        words += ' and ' + _number_to_words_indian(paise) + ' Paise'
    words += ' Only'
    return words


def _render_pdf(html_string):
    """Render HTML string to PDF bytes. Tries xhtml2pdf (pure Python)."""
    try:
        from xhtml2pdf import pisa
        import io
        result_buffer = io.BytesIO()
        pisa_status = pisa.CreatePDF(io.StringIO(html_string), dest=result_buffer)
        if pisa_status.err:
            raise RuntimeError(f'xhtml2pdf conversion error: {pisa_status.err}')
        return result_buffer.getvalue()
    except ImportError:
        logger.error('xhtml2pdf not installed. Install with: pip install xhtml2pdf')
        raise


def _upload_to_supabase(pdf_bytes, storage_path):
    """Upload PDF to Supabase Storage bucket 'invoices'."""
    try:
        from supabase import create_client
        supabase_url = settings.SUPABASE_URL
        supabase_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', settings.SUPABASE_ANON_KEY)

        if not supabase_url or not supabase_key:
            logger.warning('Supabase credentials not configured. Saving PDF locally.')
            return _save_locally(pdf_bytes, storage_path)

        client = create_client(supabase_url, supabase_key)
        client.storage.from_('invoices').upload(
            path=storage_path,
            file=pdf_bytes,
            file_options={'content-type': 'application/pdf'}
        )
        logger.info(f'Invoice PDF uploaded to Supabase: {storage_path}')
        return storage_path

    except Exception as e:
        logger.warning(f'Supabase upload failed: {e}. Saving locally as fallback.')
        return _save_locally(pdf_bytes, storage_path)


def _save_locally(pdf_bytes, storage_path):
    """Fallback: save PDF to local media directory."""
    local_dir = os.path.join(settings.MEDIA_ROOT, 'invoices')
    os.makedirs(local_dir, exist_ok=True)
    filename = os.path.basename(storage_path)
    local_path = os.path.join(local_dir, filename)
    with open(local_path, 'wb') as f:
        f.write(pdf_bytes)
    logger.info(f'Invoice PDF saved locally: {local_path}')
    return f'local:{local_path}'


def generate_invoice(order_id):
    """
    Generate an invoice for the given order.

    Idempotent: if invoice already exists, returns the existing one.
    Returns the Invoice instance.
    """
    # Check for existing invoice first (outside transaction for speed)
    try:
        existing = Invoice.objects.select_related('order').get(order_id=order_id)
        logger.info(f'Invoice {existing.invoice_number} already exists for order {order_id}')
        return existing
    except Invoice.DoesNotExist:
        pass

    with transaction.atomic():
        # Re-check inside transaction (double-check locking)
        try:
            existing = Invoice.objects.select_for_update().get(order_id=order_id)
            return existing
        except Invoice.DoesNotExist:
            pass

        # Fetch order with all related data
        order = (
            Order.objects
            .select_related('shop', 'customer')
            .prefetch_related('items', 'items__product')
            .get(id=order_id)
        )

        # Generate invoice number
        invoice_number = generate_invoice_number()

        # Calculate amounts
        subtotal = sum(item.total_price for item in order.items.all())
        delivery_charge = order.delivery_fee or Decimal('0.00')
        discount = order.discount or Decimal('0.00')
        taxable_amount = subtotal - discount
        grand_total = taxable_amount + delivery_charge

        # Build template context
        items_data = []
        for idx, item in enumerate(order.items.all(), 1):
            items_data.append({
                'sno': idx,
                'description': item.product_name,
                'category': item.product.category.name if item.product and item.product.category else '',
                'shop_name': order.shop.name,
                'hsn': '',  # HSN not tracked in current Product model
                'qty': item.quantity,
                'uom': item.product.unit if item.product else 'piece',
                'rate': f'{item.unit_price:.2f}',
                'amount': f'{item.total_price:.2f}',
            })

        context = {
            'invoice_number': invoice_number,
            'order': order,
            'order_number': order.order_number,
            'order_date': (order.delivered_at or order.created_at).strftime('%d.%m.%Y'),
            'customer_name': order.customer_name,
            'customer_phone': order.customer_phone,
            'customer_address': order.delivery_address,
            'customer_town': order.delivery_town,
            'shop_name': order.shop.name,
            'shop_address': order.shop.address,
            'shop_town': order.shop.town,
            'shop_phone': order.shop.phone,
            'items': items_data,
            'subtotal': f'{subtotal:.2f}',
            'taxable_amount': f'{taxable_amount:.2f}',
            'delivery_charge': f'{delivery_charge:.2f}',
            'discount': f'{discount:.2f}',
            'grand_total': f'{grand_total:.2f}',
            'amount_in_words': amount_in_words(float(grand_total)),
            'generated_at': timezone.now().strftime('%d.%m.%Y %H:%M'),
        }

        # Render HTML
        html_string = render_to_string('invoice/townbasket_invoice.html', context)

        # Generate PDF
        pdf_bytes = _render_pdf(html_string)

        # Upload to storage
        filename = f'{invoice_number.replace("-", "_")}.pdf'
        storage_path = f'{timezone.localdate().year}/{filename}'
        pdf_path = _upload_to_supabase(pdf_bytes, storage_path)

        # Create Invoice record
        invoice = Invoice(
            order=order,
            invoice_number=invoice_number,
            pdf_path=pdf_path,
            total_amount=grand_total,
            status='generated',
            generated_at=timezone.now(),
        )
        invoice.save()

        logger.info(
            f'Invoice {invoice_number} generated for order {order.order_number} '
            f'(₹{grand_total})'
        )
        return invoice
