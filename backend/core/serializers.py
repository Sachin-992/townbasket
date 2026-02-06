from rest_framework import serializers
from .models import TownSettings

class TownSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = TownSettings
        fields = '__all__'
        read_only_fields = ['updated_at']
