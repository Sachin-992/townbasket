from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.utils import timezone
from shops.models import Shop
from products.models import Product
from users.models import User
from .models import Order, OrderItem
from .serializers import OrderSerializer, OrderCreateSerializer


def check_auth(request):
    """Helper to check if user is authenticated"""
    if not hasattr(request, 'supabase_user') or not request.supabase_user:
        return None
    return request.supabase_user


def check_admin(request):
    """Helper to check if user is admin"""
    user = check_auth(request)
    if not user:
        return False
    user_metadata = user.get('user_metadata', {})
    return user_metadata.get('app_role') == 'admin'


@api_view(['GET'])
def seller_orders(request):
    """
    Get orders for a seller's shop. Seller only.
    """
    user = check_auth(request)
    if not user:
        return Response(
            {'error': 'Authentication required'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    supabase_uid = request.query_params.get('supabase_uid')
    status_filter = request.query_params.get('status')
    
    # Verify the request is for the authenticated user's shop
    if supabase_uid and supabase_uid != user.get('user_id'):
        return Response(
            {'error': 'Cannot access another seller\'s orders'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    user_id = user.get('user_id')
    
    try:
        shop = Shop.objects.get(owner_supabase_uid=user_id)
    except Shop.DoesNotExist:
        return Response(
            {'error': 'Shop not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    orders = Order.objects.filter(shop=shop)
    
    if status_filter:
        orders = orders.filter(status=status_filter)
    
    serializer = OrderSerializer(orders, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def customer_orders(request):
    """
    Get orders for a customer. Customer only (own orders).
    """
    user = check_auth(request)
    if not user:
        return Response(
            {'error': 'Authentication required'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    supabase_uid = request.query_params.get('supabase_uid')
    
    # Verify the request is for the authenticated user
    if supabase_uid and supabase_uid != user.get('user_id'):
        return Response(
            {'error': 'Cannot access another customer\'s orders'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    user_id = user.get('user_id')
    orders = Order.objects.filter(customer_supabase_uid=user_id)
    serializer = OrderSerializer(orders, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def delivery_orders(request):
    """
    Get orders for delivery partners.
    """
    user = check_auth(request)
    if not user:
        return Response(
            {'error': 'Authentication required'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    status_filter = request.query_params.get('status', 'available')
    user_id = user.get('user_id')
    
    if status_filter == 'available':
        orders = Order.objects.filter(status='ready', delivery_supabase_uid__isnull=True)
    elif status_filter == 'my-orders':
        # Orders assigned to this delivery partner
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
    
    serializer = OrderSerializer(orders, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def all_orders(request):
    """
    Get all orders. Admin only.
    """
    if not check_admin(request):
        return Response(
            {'error': 'Admin access required'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    orders = Order.objects.all().order_by('-created_at')[:100]
    serializer = OrderSerializer(orders, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def order_detail(request, order_id):
    """
    Get order details. Must be order owner, shop owner, or admin.
    """
    user = check_auth(request)
    if not user:
        return Response(
            {'error': 'Authentication required'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    try:
        order = Order.objects.get(id=order_id)
    except Order.DoesNotExist:
        return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
    
    user_id = user.get('user_id')
    user_metadata = user.get('user_metadata', {})
    is_admin = user_metadata.get('app_role') == 'admin'
    
    # Check access: customer, shop owner, or admin
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
    """
    Update order status. Seller or delivery partner only.
    """
    user = check_auth(request)
    if not user:
        return Response(
            {'error': 'Authentication required'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    try:
        order = Order.objects.get(id=order_id)
    except Order.DoesNotExist:
        return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
    
    user_id = user.get('user_id')
    
    # Check if user is shop owner or delivery partner for this order
    is_shop_owner = order.shop.owner_supabase_uid == user_id
    is_delivery = getattr(order, 'delivery_supabase_uid', None) == user_id
    
    if not (is_shop_owner or is_delivery):
        return Response(
            {'error': 'Only shop owner or assigned delivery can update order'},
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
    
    order.status = new_status
    
    if new_status == 'confirmed':
        order.confirmed_at = timezone.now()
    elif new_status == 'delivered':
        order.delivered_at = timezone.now()
        order.payment_status = 'paid'
        
        # Award rewards to customer
        try:
            customer = User.objects.get(supabase_uid=order.customer_supabase_uid)
            
            # Calculate points (1 point per ₹10)
            points_earned = int(order.total / 10)
            customer.reward_points += points_earned
            
            # Track total spending for free delivery milestone
            old_total = float(customer.total_orders_value)
            new_total = old_total + float(order.total)
            customer.total_orders_value = new_total
            
            # Award free deliveries: 1 free delivery per ₹500 milestone
            # Check how many ₹500 milestones crossed
            old_milestones = int(old_total / 500)
            new_milestones = int(new_total / 500)
            free_deliveries_earned = new_milestones - old_milestones
            
            if free_deliveries_earned > 0:
                customer.free_deliveries_available += free_deliveries_earned
            
            customer.save()
        except User.DoesNotExist:
            pass  # Customer not found, skip rewards
    
    if seller_note:
        order.seller_note = seller_note
    
    order.save()
    
    return Response(OrderSerializer(order).data)


@api_view(['POST'])
def create_order(request):
    """
    Create a new order. Requires authentication.
    """
    user = check_auth(request)
    if not user:
        return Response(
            {'error': 'Authentication required'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    serializer = OrderCreateSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    data = serializer.validated_data
    
    # Verify the order is for the authenticated user
    if data['customer_supabase_uid'] != user.get('user_id'):
        return Response(
            {'error': 'Cannot create order for another user'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        shop = Shop.objects.get(id=data['shop_id'])
    except Shop.DoesNotExist:
        return Response({'error': 'Shop not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Check if shop is open
    if not shop.is_open:
        return Response(
            {'error': 'Shop is currently closed'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Calculate totals
    subtotal = 0
    order_items = []
    
    for item in data['items']:
        product_id = item.get('product_id')
        quantity = item.get('quantity', 1)
        
        try:
            product = Product.objects.get(id=product_id, shop=shop)
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
    
    # Create order
    # Check if user has free deliveries available and auto-apply
    free_delivery_applied = False
    delivery_fee = 0  # Default delivery fee (can be calculated based on distance later)
    
    try:
        customer = User.objects.get(supabase_uid=data['customer_supabase_uid'])
        if customer.free_deliveries_available > 0:
            # Apply free delivery
            free_delivery_applied = True
            delivery_fee = 0
            # Decrement available free deliveries
            customer.free_deliveries_available -= 1
            customer.free_deliveries_used += 1
            customer.save()
    except User.DoesNotExist:
        pass  # Continue without free delivery
    
    order = Order.objects.create(
        customer_supabase_uid=data['customer_supabase_uid'],
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
    
    # Create order items
    for item in order_items:
        OrderItem.objects.create(order=order, **item)
    
    # Include free delivery info in response
    response_data = OrderSerializer(order).data
    response_data['free_delivery_applied'] = free_delivery_applied
    
    return Response(response_data, status=status.HTTP_201_CREATED)


@api_view(['PATCH'])
def accept_delivery(request, order_id):
    """
    Accept a delivery assignment. Delivery partner only.
    """
    user = check_auth(request)
    if not user:
        return Response(
            {'error': 'Authentication required'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    try:
        order = Order.objects.get(id=order_id)
    except Order.DoesNotExist:
        return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if order.status != 'ready':
        return Response(
            {'error': 'Order is not ready for pickup'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Assign delivery partner
    order.delivery_supabase_uid = user.get('user_id')
    order.save()
    
    return Response({
        'message': 'Delivery accepted',
        'order': OrderSerializer(order).data
    })
@api_view(['GET'])
def delivery_stats(request):
    """
    Get delivery stats for the current partner.
    """
    user = check_auth(request)
    if not user:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        
    user_id = user.get('user_id')
    today = timezone.now().date()
    
    # Orders delivered by this partner today
    completed_today = Order.objects.filter(
        delivery_supabase_uid=user_id,
        status='delivered',
        delivered_at__date=today
    )
    
    # Calculate today's earnings
    total_earnings = 0
    for order in completed_today:
        total_earnings += float(order.delivery_fee if order.delivery_fee > 0 else 15)
        
    # Calculate monthly earnings
    first_day_of_month = today.replace(day=1)
    completed_this_month = Order.objects.filter(
        delivery_supabase_uid=user_id,
        status='delivered',
        delivered_at__date__gte=first_day_of_month
    )
    monthly_earnings = 0
    for order in completed_this_month:
        monthly_earnings += float(order.delivery_fee if order.delivery_fee > 0 else 15)

    # Pending COD to be collected/submitted (for active orders)
    active_cod_orders = Order.objects.filter(
        delivery_supabase_uid=user_id,
        status__in=['ready', 'out_for_delivery'],
        payment_method='cod'
    )
    pending_cod = 0
    for order in active_cod_orders:
        pending_cod += float(order.total)
        
    return Response({
        'today_earnings': total_earnings,
        'monthly_earnings': monthly_earnings,
        'completed_count': completed_today.count(),
        'completed_month_count': completed_this_month.count(),
        'pending_cod': pending_cod
    })
