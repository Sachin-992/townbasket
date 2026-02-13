from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db import models
import logging
from .models import ProductCategory, Product
from .serializers import ProductCategorySerializer, ProductSerializer, ProductCreateSerializer

logger = logging.getLogger('townbasket_backend')


@api_view(['GET', 'POST'])
def products_list_create(request):
    """
    GET: List products (filtered by shop_id if provided)
    POST: Create a new product
    """
    if request.method == 'GET':
        shop_id = request.query_params.get('shop_id')
        
        if shop_id:
            products = Product.objects.filter(
                shop_id=shop_id, is_active=True
            ).select_related('shop', 'category')
        else:
            products = Product.objects.filter(
                is_active=True, shop__status='approved'
            ).select_related('shop', 'category')
        
        serializer = ProductSerializer(products, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        # Require authentication for creating products
        if not hasattr(request, 'supabase_user') or not request.supabase_user:
            return Response(
                {'error': 'Authentication required'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        serializer = ProductCreateSerializer(data=request.data)
        
        if serializer.is_valid():
            # Verify the user owns the shop
            shop = serializer.validated_data.get('shop')
            if shop.owner_supabase_uid != request.supabase_user.get('user_id'):
                return Response(
                    {'error': 'You can only add products to your own shop'},
                    status=status.HTTP_403_FORBIDDEN
                )
            product = serializer.save()
            return Response(ProductSerializer(product).data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
def product_detail(request, product_id):
    """
    GET: Get product details
    PUT/PATCH: Update product
    DELETE: Delete product (soft delete by setting is_active=False)
    """
    try:
        product = Product.objects.select_related('shop').get(id=product_id)
    except Product.DoesNotExist:
        return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        serializer = ProductSerializer(product)
        return Response(serializer.data)
    
    elif request.method in ['PUT', 'PATCH']:
        # Require authentication and ownership
        if not hasattr(request, 'supabase_user') or not request.supabase_user:
            return Response(
                {'error': 'Authentication required'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        if product.shop.owner_supabase_uid != request.supabase_user.get('user_id'):
            return Response(
                {'error': 'You can only update your own products'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = ProductSerializer(product, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        # Require authentication and ownership
        if not hasattr(request, 'supabase_user') or not request.supabase_user:
            return Response(
                {'error': 'Authentication required'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        if product.shop.owner_supabase_uid != request.supabase_user.get('user_id'):
            return Response(
                {'error': 'You can only delete your own products'},
                status=status.HTTP_403_FORBIDDEN
            )

        product.is_active = False
        product.save()
        logger.info(f'Product soft-deleted: {product.id} by {request.supabase_user.get("user_id")}')
        return Response({'message': 'Product deleted'}, status=status.HTTP_200_OK)


@api_view(['PATCH'])
def toggle_product_stock(request, product_id):
    """
    Toggle product in_stock status. Owner only.
    """
    # Require authentication
    if not hasattr(request, 'supabase_user') or not request.supabase_user:
        return Response(
            {'error': 'Authentication required'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    try:
        product = Product.objects.select_related('shop').get(id=product_id)
    except Product.DoesNotExist:
        return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Verify ownership
    if product.shop.owner_supabase_uid != request.supabase_user.get('user_id'):
        return Response(
            {'error': 'You can only toggle stock for your own products'},
            status=status.HTTP_403_FORBIDDEN
        )

    product.in_stock = not product.in_stock
    product.save()
    
    return Response({
        'in_stock': product.in_stock,
        'message': 'Product is now in stock' if product.in_stock else 'Product is now out of stock'
    })


@api_view(['GET'])
def product_categories(request):
    """
    List product categories (global + shop-specific if shop_id provided).
    """
    shop_id = request.query_params.get('shop_id')
    
    if shop_id:
        categories = ProductCategory.objects.filter(
            is_active=True
        ).filter(
            models.Q(is_global=True) | models.Q(shop_id=shop_id)
        )
    else:
        categories = ProductCategory.objects.filter(is_global=True, is_active=True)
    
    serializer = ProductCategorySerializer(categories, many=True)
    return Response(serializer.data)
