from rest_framework import serializers
from .models import Complaint

class ComplaintSerializer(serializers.ModelSerializer):
    class Meta:
        model = Complaint
        fields = '__all__'
        read_only_fields = ['status', 'resolved_at', 'created_at', 'updated_at', 'user_supabase_uid', 'user_name', 'user_phone']

class ComplaintCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Complaint
        fields = ['issue_type', 'description', 'order_id']

class ComplaintResolveSerializer(serializers.ModelSerializer):
    class Meta:
        model = Complaint
        fields = ['status', 'admin_note']
