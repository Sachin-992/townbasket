"""
User Serializers - SECURED

Separates public (safe) fields from private (internal) fields.
"""
from rest_framework import serializers
from .models import User


class UserPublicSerializer(serializers.ModelSerializer):
    """
    Public serializer - safe fields only.
    Use for listing users, public profiles, etc.
    """
    class Meta:
        model = User
        fields = [
            'id',
            'name',
            'phone',
            'email',
            'role',
            'town',
            'is_active',
            'is_online',
            'is_enrolled',
            'created_at',
        ]
        read_only_fields = fields



class UserSerializer(serializers.ModelSerializer):
    """
    Full serializer for authenticated user's own profile.
    Includes sensitive fields like wallet balance and addresses.
    """
    class Meta:
        model = User
        fields = [
            'id',
            'supabase_uid',
            'phone',
            'email',
            'name',
            'role',
            'town',
            'is_verified',
            'is_active',
            'is_online',
            'is_enrolled',
            'rider_data',
            'saved_addresses',
            'wallet_balance',
            'reward_points',
            'total_orders_value',
            'free_deliveries_available',
            'free_deliveries_used',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id', 'supabase_uid', 'is_verified', 'is_active',
            'wallet_balance', 'reward_points', 'total_orders_value',
            'free_deliveries_available', 'free_deliveries_used',
            'created_at', 'updated_at'
        ]


class RoleUpdateSerializer(serializers.Serializer):
    """
    Serializer for updating user role.
    SECURITY: 'admin' is not allowed via API.
    """
    role = serializers.ChoiceField(choices=['customer', 'seller', 'delivery'])
