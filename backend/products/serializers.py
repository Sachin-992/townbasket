from rest_framework import serializers
from .models import ProductCategory, Product


class ProductCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductCategory
        fields = ['id', 'name', 'shop', 'is_global', 'display_order', 'is_active']


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    shop_name = serializers.CharField(source='shop.name', read_only=True)
    effective_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    discount_percentage = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Product
        fields = [
            'id',
            'shop',
            'shop_name',
            'category',
            'category_name',
            'name',
            'description',
            'price',
            'discount_price',
            'effective_price',
            'discount_percentage',
            'unit',
            'unit_quantity',
            'image_url',
            'in_stock',
            'stock_quantity',
            'is_active',
            'is_featured',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ProductCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = [
            'shop',
            'category',
            'name',
            'description',
            'price',
            'discount_price',
            'unit',
            'unit_quantity',
            'image_url',
            'in_stock',
            'stock_quantity',
            'is_featured',
        ]
