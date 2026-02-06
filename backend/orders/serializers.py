from rest_framework import serializers
from .models import Order, OrderItem
from users.models import User


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = [
            'id',
            'product',
            'product_name',
            'product_image_url',
            'quantity',
            'unit_price',
            'total_price',
        ]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    shop_name = serializers.CharField(source='shop.name', read_only=True)
    shop_address = serializers.CharField(source='shop.address', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    delivery_partner_name = serializers.SerializerMethodField()
    delivery_partner_phone = serializers.SerializerMethodField()
    
    def get_delivery_partner_name(self, obj):
        if not obj.delivery_supabase_uid:
            return None
        try:
            user = User.objects.get(supabase_uid=obj.delivery_supabase_uid)
            return user.name or user.phone or "Assigned Partner"
        except User.DoesNotExist:
            return "Assigned Partner"
    
    def get_delivery_partner_phone(self, obj):
        if not obj.delivery_supabase_uid:
            return None
        try:
            user = User.objects.get(supabase_uid=obj.delivery_supabase_uid)
            return user.phone
        except User.DoesNotExist:
            return None
            
    class Meta:
        model = Order
        fields = [
            'id',
            'order_number',
            'customer_supabase_uid',
            'customer_name',
            'customer_phone',
            'delivery_address',
            'delivery_area',
            'delivery_town',
            'shop',
            'shop_name',
            'shop_address',
            'delivery_supabase_uid',
            'items',
            'subtotal',
            'delivery_fee',
            'discount',
            'total',
            'payment_method',
            'payment_status',
            'status',
            'status_display',
            'customer_note',
            'seller_note',
            'created_at',
            'updated_at',
            'confirmed_at',
            'delivered_at',
            'free_delivery_used',
            'delivery_partner_name',
            'delivery_partner_phone',
        ]
        read_only_fields = ['id', 'order_number', 'created_at', 'updated_at']


class OrderCreateSerializer(serializers.Serializer):
    """
    Serializer for creating a new order.
    """
    customer_supabase_uid = serializers.CharField()
    customer_name = serializers.CharField()
    customer_phone = serializers.CharField()
    delivery_address = serializers.CharField()
    delivery_area = serializers.CharField(required=False, allow_blank=True)
    delivery_town = serializers.CharField()
    shop_id = serializers.IntegerField()
    payment_method = serializers.ChoiceField(choices=['cod', 'upi', 'online'], default='cod')
    customer_note = serializers.CharField(required=False, allow_blank=True)
    items = serializers.ListField(child=serializers.DictField())
