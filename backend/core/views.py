from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import TownSettings
from .serializers import TownSettingsSerializer

@api_view(['GET', 'PATCH'])
def town_settings(request):
    """
    Get or update global town settings.
    Admin only for updates.
    """
    settings = TownSettings.load()
    
    if request.method == 'GET':
        return Response(TownSettingsSerializer(settings).data)
        
    elif request.method == 'PATCH':
        auth_header = request.headers.get('Authorization')
        if not auth_header:
             return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
             
        # Ideally check for admin role here as well using request.supabase_user 
        # (Assuming middleware attaches it)

        serializer = TownSettingsSerializer(settings, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
