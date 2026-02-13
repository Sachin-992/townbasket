"""
Order views with security hardening:
- JWT-derived identity (never trust client-submitted UIDs)
- transaction.atomic for multi-step operations
- select_related / prefetch_related for N+1 prevention
- Structured logging
- Custom throttling on order creation
"""
import logging
from rest_framework import status
from rest_framework.decorators import api_view, throttle_classes
from rest_framework.response import Response
from django.utils import timezone
from django.conf import settings
from django.db import transaction, models
from django.db.models import Sum, Count, F, Value, DecimalField
from django.db.models.functions import Coalesce, ExtractHour
from shops.models import Shop
from products.models import Product
from users.models import User
from .models import Order, OrderItem
from .serializers import OrderSerializer, OrderCreateSerializer
from core.admin_views import log_admin_action
from townbasket_backend.throttles import OrderCreateThrottle

logger = logging.getLogger('townbasket_backend')

# ────────────────────────────────────────────
# Auth Helpers
# ────────────────────────────────────────────

def check_auth(request):
    """Return supabase_user dict or None."""
    if not hasattr(request, 'supabase_user') or not request.supabase_user:
        return None
    return request.supabase_user


def get_user_id(request):
    """Extract user_id from JWT token (the 'sub' claim)."""
    user = check_auth(request)
    if not user:
        return None
    # Prefer 'sub' (standard JWT claim), fall back to 'user_id'
    return user.get('sub') or user.get('user_id')


def check_admin(request):
    """Check if authenticated user has admin role."""
    user = check_auth(request)
    if not user:
        return False
    user_metadata = user.get('user_metadata', {})
    return user_metadata.get('app_role') == 'admin'


def _auth_required_response():
    return Response(
        {'error': 'Authentication required'},
        status=status.HTTP_401_UNAUTHORIZED
    )


# ────────────────────────────────────────────
# Order List Endpoints
# ────────────────────────────────────────────

ORDER_SELECT_RELATED = ['shop', 'customer', 'delivery_partner']
ORDER_PREFETCH_RELATED = ['items', 'items__product']


@api_view(['GET'])
def seller_orders(request):
    """Get orders for a seller's shop. Uses JWT identity."""
    user_id = get_user_id(request)
    if not user_id:
        return _auth_required_response()

    try:
        shop = Shop.objects.get(owner_supabase_uid=user_id)
    except Shop.DoesNotExist:
        return Response(
            {'error': 'Shop not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    orders = (
        Order.objects
        .filter(shop=shop)
        .select_related(*ORDER_SELECT_RELATED)
        .prefetch_related(*ORDER_PREFETCH_RELATED)
    )

    status_filter = request.query_params.get('status')
    if status_filter:
        orders = orders.filter(status=status_filter)

    orders = orders.order_by('-created_at')

    serializer = OrderSerializer(orders, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def customer_orders(request):
    """Get orders for the authenticated customer. Uses JWT identity."""
    user_id = get_user_id(request)
    if not user_id:
        return _auth_required_response()

    orders = (
        Order.objects
        .filter(customer_supabase_uid=user_id)
        .select_related(*ORDER_SELECT_RELATED)
        .prefetch_related(*ORDER_PREFETCH_RELATED)
        .order_by('-created_at')
    )

    serializer = OrderSerializer(orders, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def delivery_orders(request):
    """Get orders for delivery partners. Uses JWT identity."""
    user_id = get_user_id(request)
    if not user_id:
        return _auth_required_response()

    status_filter = request.query_params.get('status', 'available')

    if status_filter == 'available':
        orders = Order.objects.filter(status='ready', delivery_supabase_uid__isnull=True)
    elif status_filter == 'my-orders':
        orders = Order.objects.filter(
            delivery_supabase_uid=user_id,
            status__in=['ready', 'out_for_delivery']
        )
    elif status_filter == 'completed':
        orders = Order.objects.filter(
            delivery_supabase_uid=user_id,
            status='delivered'
        )
    else:
        orders = Order.objects.filter(status='ready')

    orders = (
        orders
        .select_related(*ORDER_SELECT_RELATED)
        .prefetch_related(*ORDER_PREFETCH_RELATED)
        .order_by('-created_at')
    )

    serializer = OrderSerializer(orders, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def all_orders(request):
    """Get all orders. Admin only."""
    if not check_admin(request):
        return Response(
            {'error': 'Admin access required'},
            status=status.HTTP_403_FORBIDDEN
        )

    orders = (
        Order.objects
        .select_related(*ORDER_SELECT_RELATED)
        .prefetch_related(*ORDER_PREFETCH_RELATED)
        .order_by('-created_at')[:100]
    )

    serializer = OrderSerializer(orders, many=True)
    return Response(serializer.data)


# ────────────────────────────────────────────
# Order Detail & Status Updates
# ────────────────────────────────────────────

@api_view(['GET'])
def order_detail(request, order_id):
    """Get order details. Must be order owner, shop owner, or admin."""
    user_id = get_user_id(request)
    if not user_id:
        return _auth_required_response()

    try:
        order = (
            Order.objects
            .select_related(*ORDER_SELECT_RELATED)
            .prefetch_related(*ORDER_PREFETCH_RELATED)
            .get(id=order_id)
        )
    except Order.DoesNotExist:
        return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)

    is_admin = check_admin(request)
    is_customer = order.customer_supabase_uid == user_id
    is_shop_owner = order.shop.owner_supabase_uid == user_id

    if not (is_customer or is_shop_owner or is_admin):
        return Response(
            {'error': 'Access denied'},
            status=status.HTTP_403_FORBIDDEN
        )

    serializer = OrderSerializer(order)
    return Response(serializer.data)


@api_view(['PATCH'])
def update_order_status(request, order_id):
    """Update order status. Seller or delivery partner only. Wrapped in atomic transaction."""
    user_id = get_user_id(request)
    if not user_id:
        return _auth_required_response()

    try:
        order = Order.objects.select_related('shop', 'customer').get(id=order_id)
    except Order.DoesNotExist:
        return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)

    is_shop_owner = order.shop.owner_supabase_uid == user_id
    is_delivery = getattr(order, 'delivery_supabase_uid', None) == user_id

    is_admin = check_admin(request)

    if not (is_shop_owner or is_delivery or is_admin):
        return Response(
            {'error': 'Only shop owner, assigned delivery, or admin can update order'},
            status=status.HTTP_403_FORBIDDEN
        )

    new_status = request.data.get('status')
    seller_note = request.data.get('seller_note')

    valid_statuses = ['confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled']
    if new_status not in valid_statuses:
        return Response(
            {'error': f'Invalid status. Must be one of: {valid_statuses}'},
            status=status.HTTP_400_BAD_REQUEST
        )

    with transaction.atomic():
        order.status = new_status

        if new_status == 'confirmed':
            order.confirmed_at = timezone.now()
        elif new_status == 'delivered':
            order.delivered_at = timezone.now()
            order.payment_status = 'paid'

            # Award rewards to customer
            try:
                customer = User.objects.select_for_update().get(
                    supabase_uid=order.customer_supabase_uid
                )
                points_earned = int(order.total / 10)
                customer.reward_points += points_earned

                old_total = float(customer.total_orders_value)
                new_total = old_total + float(order.total)
                customer.total_orders_value = new_total

                old_milestones = int(old_total / 500)
                new_milestones = int(new_total / 500)
                free_deliveries_earned = new_milestones - old_milestones

                if free_deliveries_earned > 0:
                    customer.free_deliveries_available += free_deliveries_earned

                customer.save()

                logger.info(
                    f"Order {order.order_number} delivered. "
                    f"Customer {customer.supabase_uid} earned {points_earned} points."
                )
            except User.DoesNotExist:
                logger.warning(
                    f"Order {order.order_number} delivered but customer "
                    f"{order.customer_supabase_uid} not found for rewards."
                )

        if seller_note:
            order.seller_note = seller_note

        order.save()

    # Invoice generation trigger (OUTSIDE transaction for non-blocking)
    if new_status == 'delivered':
        try:
            from orders.tasks import trigger_invoice_generation
            trigger_invoice_generation(order.id)
            logger.info(f'Invoice generation triggered for order {order.order_number}')
        except Exception as inv_err:
            logger.error(f'Invoice trigger failed for {order.order_number}: {inv_err}')

    logger.info(f"Order {order.order_number} status updated to '{new_status}' by {user_id}")

    # Audit-log if the caller is an admin
    if is_admin:
        log_admin_action(
            request, 'order_override', 'order', order.id,
            {'order_number': order.order_number, 'new_status': new_status},
        )

    return Response(OrderSerializer(order).data)


# ────────────────────────────────────────────
# Order Creation (Critical — atomic + JWT identity)
# ────────────────────────────────────────────

@api_view(['POST'])
@throttle_classes([OrderCreateThrottle])
def create_order(request):
    """
    Create a new order.
    SECURITY: Uses JWT-derived identity, NOT client-submitted UID.
    SAFETY: Wrapped in transaction.atomic to prevent partial writes.
    """
    user_id = get_user_id(request)
    if not user_id:
        return _auth_required_response()

    serializer = OrderCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data

    # SECURITY FIX: Override client-submitted UID with JWT-derived identity
    # The client may submit customer_supabase_uid for backwards compat,
    # but we ALWAYS use the JWT token's identity.
    customer_uid = user_id

    try:
        shop = Shop.objects.get(id=data['shop_id'])
    except Shop.DoesNotExist:
        return Response({'error': 'Shop not found'}, status=status.HTTP_404_NOT_FOUND)

    if not shop.is_open:
        return Response(
            {'error': 'Shop is currently closed'},
            status=status.HTTP_400_BAD_REQUEST
        )

    with transaction.atomic():
        # Calculate totals with server-side price verification
        subtotal = 0
        order_items = []

        for item in data['items']:
            product_id = item.get('product_id')
            quantity = item.get('quantity', 1)

            try:
                # Lock the product row to prevent concurrent stock issues
                product = Product.objects.select_for_update().get(id=product_id, shop=shop)
            except Product.DoesNotExist:
                return Response(
                    {'error': f'Product {product_id} not found'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if not product.in_stock:
                return Response(
                    {'error': f'{product.name} is out of stock'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            unit_price = product.effective_price
            total_price = unit_price * quantity
            subtotal += total_price

            order_items.append({
                'product': product,
                'product_name': product.name,
                'product_image_url': product.image_url,
                'quantity': quantity,
                'unit_price': unit_price,
                'total_price': total_price,
            })

        # Check free delivery eligibility
        free_delivery_applied = False
        delivery_fee = 0

        try:
            customer = User.objects.select_for_update().get(supabase_uid=customer_uid)
            if customer.free_deliveries_available > 0:
                free_delivery_applied = True
                delivery_fee = 0
                customer.free_deliveries_available -= 1
                customer.free_deliveries_used += 1
                customer.save()
        except User.DoesNotExist:
            customer = None

        order = Order.objects.create(
            customer=customer,
            customer_supabase_uid=customer_uid,
            customer_name=data['customer_name'],
            customer_phone=data['customer_phone'],
            delivery_address=data['delivery_address'],
            delivery_area=data.get('delivery_area', ''),
            delivery_town=data['delivery_town'],
            shop=shop,
            subtotal=subtotal,
            delivery_fee=delivery_fee,
            total=subtotal + delivery_fee,
            payment_method=data.get('payment_method', 'cod'),
            customer_note=data.get('customer_note', ''),
            free_delivery_used=free_delivery_applied,
        )

        for item in order_items:
            OrderItem.objects.create(order=order, **item)

    logger.info(
        f"Order {order.order_number} created by {customer_uid} "
        f"for shop {shop.name} (₹{order.total})"
    )

    response_data = OrderSerializer(order).data
    response_data['free_delivery_applied'] = free_delivery_applied
    return Response(response_data, status=status.HTTP_201_CREATED)


# ────────────────────────────────────────────
# Delivery Actions
# ────────────────────────────────────────────

@api_view(['PATCH'])
def accept_delivery(request, order_id):
    """Accept a delivery assignment. Uses JWT identity."""
    user_id = get_user_id(request)
    if not user_id:
        return _auth_required_response()

    with transaction.atomic():
        try:
            order = Order.objects.select_for_update().get(id=order_id)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)

        if order.status != 'ready':
            return Response(
                {'error': 'Order is not ready for pickup'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if order.delivery_supabase_uid:
            return Response(
                {'error': 'Order already assigned to a delivery partner'},
                status=status.HTTP_409_CONFLICT
            )

        order.delivery_supabase_uid = user_id
        # Also try to link the FK
        try:
            delivery_user = User.objects.get(supabase_uid=user_id)
            order.delivery_partner = delivery_user
        except User.DoesNotExist:
            pass
        order.save()

    logger.info(f"Delivery for order {order.order_number} accepted by {user_id}")
    return Response({
        'message': 'Delivery accepted',
        'order': OrderSerializer(order).data
    })


# ────────────────────────────────────────────
# Stats Endpoints
# ────────────────────────────────────────────

@api_view(['GET'])
def delivery_stats(request):
    """Get delivery stats for the current partner. Uses JWT identity."""
    user_id = get_user_id(request)
    if not user_id:
        return _auth_required_response()

    today = timezone.now().date()
    first_day_of_month = today.replace(day=1)

    # Use DB-level aggregation instead of Python loops
    completed_today = Order.objects.filter(
        delivery_supabase_uid=user_id,
        status='delivered',
        delivered_at__date=today
    )

    today_agg = completed_today.aggregate(
        total_earnings=Coalesce(
            Sum('delivery_fee'),
            Value(0),
            output_field=DecimalField()
        ),
        count=Count('id')
    )

    completed_month = Order.objects.filter(
        delivery_supabase_uid=user_id,
        status='delivered',
        delivered_at__date__gte=first_day_of_month
    )

    month_agg = completed_month.aggregate(
        total_earnings=Coalesce(
            Sum('delivery_fee'),
            Value(0),
            output_field=DecimalField()
        ),
        count=Count('id')
    )

    pending_cod = Order.objects.filter(
        delivery_supabase_uid=user_id,
        status__in=['ready', 'out_for_delivery'],
        payment_method='cod'
    ).aggregate(
        total=Coalesce(Sum('total'), Value(0), output_field=DecimalField())
    )

    return Response({
        'today_earnings': float(today_agg['total_earnings']),
        'monthly_earnings': float(month_agg['total_earnings']),
        'completed_count': today_agg['count'],
        'completed_month_count': month_agg['count'],
        'pending_cod': float(pending_cod['total']),
    })


# ────────────────────────────────────────────
# Server-Side Seller Stats (NEW — Phase 2)
# ────────────────────────────────────────────

@api_view(['GET'])
def seller_stats(request):
    """
    Server-side seller stats endpoint.
    Returns aggregated analytics instead of raw order lists.
    Uses JWT identity.
    """
    user_id = get_user_id(request)
    if not user_id:
        return _auth_required_response()

    try:
        shop = Shop.objects.get(owner_supabase_uid=user_id)
    except Shop.DoesNotExist:
        return Response({'error': 'Shop not found'}, status=status.HTTP_404_NOT_FOUND)

    now = timezone.now()
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
    one_week_ago = now - timezone.timedelta(days=7)
    two_weeks_ago = now - timezone.timedelta(days=14)

    shop_orders = Order.objects.filter(shop=shop)

    # Today's delivered orders stats
    delivered_today = shop_orders.filter(
        status='delivered',
        delivered_at__gte=start_of_day
    )
    today_agg = delivered_today.aggregate(
        revenue=Coalesce(Sum('total'), Value(0), output_field=DecimalField()),
        count=Count('id'),
        upi_revenue=Coalesce(
            Sum('total', filter=models.Q(payment_method__in=['upi', 'online'])),
            Value(0), output_field=DecimalField()
        ),
        cod_revenue=Coalesce(
            Sum('total', filter=models.Q(payment_method='cod')),
            Value(0), output_field=DecimalField()
        ),
    )

    # Cancelled today
    cancelled_today = shop_orders.filter(
        status='cancelled',
        created_at__gte=start_of_day
    ).count()

    # This week vs last week revenue
    this_week_revenue = shop_orders.filter(
        status='delivered',
        created_at__gte=one_week_ago
    ).aggregate(
        total=Coalesce(Sum('total'), Value(0), output_field=DecimalField())
    )['total']

    last_week_revenue = shop_orders.filter(
        status='delivered',
        created_at__gte=two_weeks_ago,
        created_at__lt=one_week_ago
    ).aggregate(
        total=Coalesce(Sum('total'), Value(0), output_field=DecimalField())
    )['total']

    # Best sellers (top 5)
    best_sellers = (
        OrderItem.objects
        .filter(order__shop=shop, order__status='delivered')
        .values('product_name')
        .annotate(total_quantity=Sum('quantity'))
        .order_by('-total_quantity')[:5]
    )

    # Busy hours (using DB aggregation)
    hour_counts = (
        shop_orders
        .annotate(hour=ExtractHour('created_at'))
        .values('hour')
        .annotate(count=Count('id'))
        .order_by('-count')[:3]
    )
    busy_hours = [
        {'hour': h['hour'], 'order_count': h['count']}
        for h in hour_counts
    ]

    # Unique customers
    unique_customers = shop_orders.values('customer_supabase_uid').distinct().count()

    # Settlement (all delivered UPI orders)
    settlement_due = shop_orders.filter(
        status='delivered',
        payment_method__in=['upi', 'online']
    ).aggregate(
        total=Coalesce(Sum('total'), Value(0), output_field=DecimalField())
    )['total']

    return Response({
        'today': {
            'revenue': float(today_agg['revenue']),
            'orders': today_agg['count'],
            'upi_revenue': float(today_agg['upi_revenue']),
            'cod_revenue': float(today_agg['cod_revenue']),
            'cancelled': cancelled_today,
        },
        'this_week_revenue': float(this_week_revenue),
        'last_week_revenue': float(last_week_revenue),
        'best_sellers': list(best_sellers),
        'busy_hours': busy_hours,
        'unique_customers': unique_customers,
        'settlement_due': float(settlement_due),
        'avg_rating': float(shop.average_rating),
        'reviews_count': shop.total_reviews,
    })


# ────────────────────────────────────────────
# Invoice Endpoints
# ────────────────────────────────────────────

@api_view(['GET'])
def download_invoice(request, order_id):
    """Download invoice PDF. Customer (order owner) or admin only."""
    user_id = get_user_id(request)
    if not user_id:
        return _auth_required_response()

    try:
        order = Order.objects.select_related('customer').get(id=order_id)
    except Order.DoesNotExist:
        return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)

    # Authorization: customer or admin
    is_owner = order.customer_supabase_uid == user_id
    is_admin = check_admin(request)

    if not (is_owner or is_admin):
        return Response(
            {'error': 'You do not have access to this invoice'},
            status=status.HTTP_403_FORBIDDEN
        )

    # Get invoice
    from orders.models import Invoice
    try:
        invoice = Invoice.objects.get(order=order)
    except Invoice.DoesNotExist:
        return Response(
            {'error': 'Invoice not yet generated for this order'},
            status=status.HTTP_404_NOT_FOUND
        )

    if invoice.status == 'pending':
        return Response(
            {'error': 'Invoice is still being generated'},
            status=status.HTTP_202_ACCEPTED
        )

    # Try to generate signed Supabase URL
    pdf_path = invoice.pdf_path

    if pdf_path.startswith('local:'):
        # Serve local file directly
        import os
        local_path = pdf_path.replace('local:', '')
        if os.path.exists(local_path):
            from django.http import FileResponse
            return FileResponse(
                open(local_path, 'rb'),
                content_type='application/pdf',
                as_attachment=True,
                filename=f'Invoice_{invoice.invoice_number}.pdf'
            )
        return Response({'error': 'PDF file not found'}, status=status.HTTP_404_NOT_FOUND)

    # Supabase signed URL
    try:
        import os as _os
        from supabase import create_client
        supabase_url = settings.SUPABASE_URL
        supabase_key = _os.environ.get('SUPABASE_SERVICE_ROLE_KEY', settings.SUPABASE_ANON_KEY)

        client = create_client(supabase_url, supabase_key)
        signed = client.storage.from_('invoices').create_signed_url(pdf_path, 300)

        return Response({
            'invoice_number': invoice.invoice_number,
            'download_url': signed.get('signedURL') or signed.get('signedUrl', ''),
            'expires_in': 300,
            'total_amount': str(invoice.total_amount),
            'generated_at': invoice.generated_at.isoformat() if invoice.generated_at else None,
        })
    except Exception as e:
        logger.error(f'Signed URL generation failed: {e}')
        return Response(
            {'error': 'Failed to generate download link'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
def resend_invoice_email(request, order_id):
    """Resend invoice email. Admin only."""
    user_id = get_user_id(request)
    if not user_id:
        return _auth_required_response()

    if not check_admin(request):
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

    from orders.models import Invoice
    try:
        order = Order.objects.get(id=order_id)
        invoice = Invoice.objects.get(order=order)
    except (Order.DoesNotExist, Invoice.DoesNotExist):
        return Response({'error': 'Invoice not found'}, status=status.HTTP_404_NOT_FOUND)

    if invoice.status not in ('generated', 'sent', 'failed'):
        return Response({'error': 'Invoice not ready for sending'}, status=status.HTTP_400_BAD_REQUEST)

    from orders.services.email_service import send_invoice_email as _send
    success = _send(invoice)

    # Audit log
    log_admin_action(
        request, 'invoice_resend', 'order', order.id,
        {'order_number': order.order_number, 'invoice_number': invoice.invoice_number},
    )

    return Response({
        'success': success,
        'invoice_number': invoice.invoice_number,
        'status': invoice.status,
    })

