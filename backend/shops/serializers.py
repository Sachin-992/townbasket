from rest_framework import serializers
from .models import Category, Shop


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'icon', 'display_order', 'is_active']


class ShopSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    
    class Meta:
        model = Shop
        fields = [
            'id',
            'owner_supabase_uid',
            'owner_name',
            'owner_phone',
            'owner_email',
            'name',
            'description',
            'category',
            'category_name',
            'address',
            'town',
            'area',
            'pincode',
            'phone',
            'whatsapp',
            'logo_url',
            'banner_url',
            'opening_time',
            'closing_time',
            'is_open_sunday',
            'status',
            'is_active',
            'is_open',
            'average_rating',
            'total_reviews',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'status', 'average_rating', 'total_reviews', 'created_at', 'updated_at']


class ShopCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating a new shop.
    """
    class Meta:
        model = Shop
        fields = [
            'owner_supabase_uid',
            'owner_name',
            'owner_phone',
            'owner_email',
            'name',
            'description',
            'category',
            'address',
            'town',
            'area',
            'pincode',
            'phone',
            'whatsapp',
            'logo_url',
            'banner_url',
            'opening_time',
            'closing_time',
            'is_open_sunday',
        ]
