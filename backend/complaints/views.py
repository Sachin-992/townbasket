from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Complaint
from .serializers import ComplaintSerializer, ComplaintCreateSerializer, ComplaintResolveSerializer
from townbasket_backend.middleware import require_auth
from django.utils import timezone

@api_view(['POST'])
@require_auth
def create_complaint(request):
    """
    Submit a new complaint. Authenticated users only.
    """
    serializer = ComplaintCreateSerializer(data=request.data)
    if serializer.is_valid():
        try:
            user_data = request.supabase_user
            
            # Create complaint with user details
            complaint = serializer.save(
                user_supabase_uid=user_data.get('user_id'),
                user_name=user_data.get('user_metadata', {}).get('name') or user_data.get('email', 'Unknown'),
                user_phone=user_data.get('user_metadata', {}).get('phone') or user_data.get('phone', '')
            )
            
            return Response(ComplaintSerializer(complaint).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
def list_complaints(request):
    """
    List all complaints. Admin only.
    """
    if not hasattr(request, 'supabase_user') or not request.supabase_user:
        return Response(
            {'error': 'Authentication required'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    # Check for admin role
    user_metadata = request.supabase_user.get('user_metadata', {})
    app_role = user_metadata.get('app_role', 'customer')
    
    if app_role != 'admin':
        return Response(
            {'error': 'Admin access required'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Filter by status if provided
    status_filter = request.query_params.get('status')
    if status_filter:
        complaints = Complaint.objects.filter(status=status_filter)
    else:
        complaints = Complaint.objects.all()
        
    serializer = ComplaintSerializer(complaints, many=True)
    return Response(serializer.data)


@api_view(['PATCH'])
def resolve_complaint(request, complaint_id):
    """
    Mark a complaint as resolved. Admin only.
    """
    if not hasattr(request, 'supabase_user') or not request.supabase_user:
        return Response(
            {'error': 'Authentication required'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    user_metadata = request.supabase_user.get('user_metadata', {})
    app_role = user_metadata.get('app_role', 'customer')
    
    if app_role != 'admin':
        return Response(
            {'error': 'Admin access required'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        complaint = Complaint.objects.get(id=complaint_id)
    except Complaint.DoesNotExist:
        return Response({'error': 'Complaint not found'}, status=status.HTTP_404_NOT_FOUND)
    
    serializer = ComplaintResolveSerializer(complaint, data=request.data, partial=True)
    
    if serializer.is_valid():
        # Auto-set resolved status if not explicitly set but note is added
        if 'status' not in serializer.validated_data:
             complaint.status = 'resolved'
        
        if complaint.status == 'resolved' and not complaint.resolved_at:
            complaint.resolved_at = timezone.now()
            
        serializer.save()
        return Response(ComplaintSerializer(complaint).data)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
