from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import ProductCategory, Product
from .serializers import ProductCategorySerializer, ProductSerializer, ProductCreateSerializer


@api_view(['GET', 'POST'])
def products_list_create(request):
    """
    GET: List products (filtered by shop_id if provided)
    POST: Create a new product
    """
    if request.method == 'GET':
        shop_id = request.query_params.get('shop_id')
        
        if shop_id:
            products = Product.objects.filter(shop_id=shop_id, is_active=True)
        else:
            products = Product.objects.filter(is_active=True, shop__status='approved')
        
        serializer = ProductSerializer(products, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        serializer = ProductCreateSerializer(data=request.data)
        
        if serializer.is_valid():
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
        product = Product.objects.get(id=product_id)
    except Product.DoesNotExist:
        return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        serializer = ProductSerializer(product)
        return Response(serializer.data)
    
    elif request.method in ['PUT', 'PATCH']:
        serializer = ProductSerializer(product, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        product.is_active = False
        product.save()
        return Response({'message': 'Product deleted'}, status=status.HTTP_200_OK)


@api_view(['PATCH'])
def toggle_product_stock(request, product_id):
    """
    Toggle product in_stock status.
    """
    try:
        product = Product.objects.get(id=product_id)
    except Product.DoesNotExist:
        return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)
    
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
