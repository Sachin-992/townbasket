from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import TownSettings
from .serializers import TownSettingsSerializer
from townbasket_backend.middleware import require_auth, require_role
from .admin_views import log_admin_action
from .rate_limit import rate_limit

@api_view(['GET'])
def town_settings_get(request):
    """Get global town settings. Public endpoint."""
    settings = TownSettings.load()
    return Response(TownSettingsSerializer(settings).data)

@api_view(['PATCH'])
@require_auth
@require_role('admin')
@rate_limit(max_requests=10, window_seconds=300, key_prefix='admin_settings')
def town_settings_update(request):
    """Update global town settings. Admin only."""
    settings = TownSettings.load()
    serializer = TownSettingsSerializer(settings, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        log_admin_action(request, 'settings_update', 'settings', settings.id, request.data)
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


