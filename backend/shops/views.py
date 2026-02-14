from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Category, Shop
from orders.models import Order
from django.utils import timezone
from django.db import transaction
from .serializers import CategorySerializer, ShopSerializer, ShopCreateSerializer
from townbasket_backend.middleware import require_auth, require_role, optional_auth
from rest_framework import status
from core.admin_views import log_admin_action
import logging

logger = logging.getLogger('townbasket_backend')


@api_view(['GET'])
def list_categories(request):
    """
    List all active categories. Public endpoint.
    """
    categories = Category.objects.filter(is_active=True)
    serializer = CategorySerializer(categories, many=True)
    return Response(serializer.data)


@api_view(['GET', 'POST'])
def shops_list_create(request):
    """
    GET: List approved shops (public)
    POST: Create a new shop (requires auth)
    """
    if request.method == 'GET':
        owner_filter = request.query_params.get('owner')
        
        if owner_filter:
            # SECURITY: Only allow fetching own shops via JWT identity
            if not hasattr(request, 'supabase_user') or not request.supabase_user:
                return Response(
                    {'error': 'Authentication required to filter by owner'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            jwt_uid = request.supabase_user.get('user_id')
            if owner_filter != jwt_uid:
                return Response(
                    {'error': 'Cannot view other users\' shops'},
                    status=status.HTTP_403_FORBIDDEN
                )
            shops = Shop.objects.filter(
                owner_supabase_uid=jwt_uid
            ).select_related('category')
        else:
            shops = Shop.objects.filter(
                status='approved', is_active=True
            ).select_related('category')
        
        serializer = ShopSerializer(shops, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        # Require authentication for creating shops
        user = getattr(request, 'supabase_user', None)
        
        if not user:
            return Response(
                {'error': 'Authentication required'},
                status=status.HTTP_401_UNAUTHORIZED)

        serializer = ShopCreateSerializer(data=request.data)
        
        if serializer.is_valid():
            # SECURITY: Force owner_supabase_uid from JWT
            jwt_uid = request.supabase_user.get('user_id')
            owner_uid = serializer.validated_data.get('owner_supabase_uid')
            
            if owner_uid != jwt_uid:
                return Response(
                    {'error': 'Cannot create shop for another user'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            with transaction.atomic():
                existing_shop = Shop.objects.filter(
                    owner_supabase_uid=jwt_uid
                ).select_for_update().first()
                
                if existing_shop:
                    return Response(
                        {'error': 'You already have a registered shop'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                shop = serializer.save()
                logger.info(f'Shop created: {shop.name} by {jwt_uid}')
            
            return Response(ShopSerializer(shop).data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH'])
def shop_detail(request, shop_id):
    """
    GET: Get shop details (public)
    PUT/PATCH: Update shop (owner only)
    """
    try:
        shop = Shop.objects.get(id=shop_id)
    except Shop.DoesNotExist:
        return Response({'error': 'Shop not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        serializer = ShopSerializer(shop)
        return Response(serializer.data)
    
    elif request.method in ['PUT', 'PATCH']:
        # Require authentication and ownership
        if not hasattr(request, 'supabase_user') or not request.supabase_user:
            return Response(
                {'error': 'Authentication required'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        if shop.owner_supabase_uid != request.supabase_user.get('user_id'):
            return Response(
                {'error': 'You can only update your own shop'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = ShopSerializer(shop, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@require_auth
def my_shop(request):

    """
    Get the shop for the current seller.
    Requires authentication.
    """
    # Check authentication
    if not hasattr(request, 'supabase_user') or not request.supabase_user:
        return Response(
            {'error': 'Authentication required'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    supabase_uid = request.query_params.get('supabase_uid')
    
    # Verify the requested UID matches authenticated user
    if supabase_uid and supabase_uid != request.supabase_user.get('user_id'):
        return Response(
            {'error': 'Cannot access another user\'s shop'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Use authenticated user's ID
    user_id = request.supabase_user.get('user_id')
    
    try:
        shop = Shop.objects.select_related('category').get(owner_supabase_uid=user_id)
        serializer = ShopSerializer(shop)
        return Response(serializer.data)
    except Shop.DoesNotExist:
        return Response(
            {'error': 'No shop found', 'has_shop': False},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['PATCH'])
def toggle_shop_open(request, shop_id):
    """
    Toggle shop open/closed status. Owner only.
    """
    if not hasattr(request, 'supabase_user') or not request.supabase_user:
        return Response(
            {'error': 'Authentication required'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    try:
        shop = Shop.objects.get(id=shop_id)
    except Shop.DoesNotExist:
        return Response({'error': 'Shop not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if shop.owner_supabase_uid != request.supabase_user.get('user_id'):
        return Response(
            {'error': 'You can only toggle your own shop'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    shop.is_open = not shop.is_open
    shop.save()
    
    return Response({
        'is_open': shop.is_open,
        'message': 'Shop is now open' if shop.is_open else 'Shop is now closed'
    })


# Admin APIs - require admin role
@api_view(['GET'])
@require_auth
@require_role('admin')
def pending_shops(request):
    """
    Get all pending shop registrations. Admin only.
    """
    shops = Shop.objects.filter(status='pending')
    serializer = ShopSerializer(shops, many=True)
    return Response(serializer.data)



@api_view(['GET'])
@require_auth
@require_role('admin')
def all_shops(request):
    """
    Get all shops. Admin only.
    """
    shops = Shop.objects.all().select_related('category')
    
    # Pagination
    page = max(int(request.query_params.get('page', 1)), 1)
    page_size = min(int(request.query_params.get('page_size', 20)), 500)
    total = shops.count()
    start = (page - 1) * page_size
    page_shops = shops.order_by('-id')[start:start + page_size]
    
    serializer = ShopSerializer(page_shops, many=True)
    return Response({
        'results': serializer.data,
        'count': total,
        'page': page,
        'page_size': page_size,
        'total_pages': (total + page_size - 1) // page_size,
    })


@api_view(['PATCH'])
@require_auth
@require_role('admin')
def approve_shop(request, shop_id):
    """
    Approve a shop registration. Admin only.
    """
    try:
        shop = Shop.objects.get(id=shop_id)
    except Shop.DoesNotExist:
        return Response({'error': 'Shop not found'}, status=status.HTTP_404_NOT_FOUND)
    
    shop.status = 'approved'
    shop.save()
    log_admin_action(request, 'shop_approve', 'shop', shop.id, {'shop_name': shop.name})
    
    return Response({'message': 'Shop approved', 'shop': ShopSerializer(shop).data})


@api_view(['PATCH'])
@require_auth
@require_role('admin')
def reject_shop(request, shop_id):
    """
    Reject a shop registration. Admin only.
    """
    try:
        shop = Shop.objects.get(id=shop_id)
    except Shop.DoesNotExist:
        return Response({'error': 'Shop not found'}, status=status.HTTP_404_NOT_FOUND)
    
    shop.status = 'rejected'
    shop.save()
    log_admin_action(request, 'shop_reject', 'shop', shop.id, {'shop_name': shop.name})
    
    return Response({'message': 'Shop rejected', 'shop': ShopSerializer(shop).data})


@api_view(['PATCH'])
@require_auth
@require_role('admin')
def toggle_shop_active(request, shop_id):
    """
    Toggle shop active/inactive status. Admin only.
    """
    try:
        shop = Shop.objects.get(id=shop_id)
    except Shop.DoesNotExist:
        return Response({'error': 'Shop not found'}, status=status.HTTP_404_NOT_FOUND)
    
    shop.is_active = not shop.is_active
    shop.save()
    log_admin_action(request, 'shop_toggle', 'shop', shop.id, {'shop_name': shop.name, 'is_active': shop.is_active})
    
    return Response({
        'message': 'Shop activated' if shop.is_active else 'Shop disabled',
        'shop': ShopSerializer(shop).data
    })



@api_view(['GET'])
@require_auth
@require_role('admin')
def get_admin_stats(request):
    """
    Get dashboard statistics for admin.
    """
    total_shops = Shop.objects.count()
    pending_shops = Shop.objects.filter(status='pending').count()
    total_orders = Order.objects.count()
    
    today = timezone.localdate()
    today_orders = Order.objects.filter(created_at__date=today).count()
    
    return Response({
        'totalShops': total_shops,
        'pendingShops': pending_shops,
        'totalOrders': total_orders,
        'todayOrders': today_orders,
    })
