from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Complaint
from .serializers import ComplaintSerializer, ComplaintCreateSerializer, ComplaintResolveSerializer
from townbasket_backend.middleware import require_auth, require_role
from core.admin_views import log_admin_action
from django.utils import timezone
from django.db import transaction
import logging

logger = logging.getLogger('townbasket_backend')

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
            
            with transaction.atomic():
                complaint = serializer.save(
                    user_supabase_uid=user_data.get('user_id'),
                    user_name=user_data.get('user_metadata', {}).get('name') or user_data.get('email', 'Unknown'),
                    user_phone=user_data.get('user_metadata', {}).get('phone') or user_data.get('phone', '')
                )
            
            logger.info(f'Complaint created: #{complaint.id} by {user_data.get("user_id")}')
            return Response(ComplaintSerializer(complaint).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f'Complaint creation failed: {e}')
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@require_auth
@require_role('admin')
def list_complaints(request):
    """
    List all complaints. Admin only. Paginated (max 100).
    """
    status_filter = request.query_params.get('status')
    page = max(int(request.query_params.get('page', 1)), 1)
    page_size = min(int(request.query_params.get('page_size', 20)), 100)

    if status_filter:
        complaints = Complaint.objects.filter(status=status_filter)
    else:
        complaints = Complaint.objects.all()

    total = complaints.count()
    start = (page - 1) * page_size
    page_complaints = complaints.order_by('-created_at')[start:start + page_size]

    serializer = ComplaintSerializer(page_complaints, many=True)
    return Response({
        'results': serializer.data,
        'count': total,
        'page': page,
        'page_size': page_size,
        'total_pages': (total + page_size - 1) // page_size,
    })

@api_view(['PATCH'])
@require_auth
@require_role('admin')
def resolve_complaint(request, complaint_id):
    """
    Mark a complaint as resolved. Admin only.
    """
    try:
        complaint = Complaint.objects.get(id=complaint_id)
    except Complaint.DoesNotExist:
        return Response({'error': 'Complaint not found'}, status=status.HTTP_404_NOT_FOUND)
    
    serializer = ComplaintResolveSerializer(complaint, data=request.data, partial=True)
    
    if serializer.is_valid():
        with transaction.atomic():
            complaint = serializer.save()
            if 'status' not in serializer.validated_data:
                complaint.status = 'resolved'
            if complaint.status == 'resolved' and not complaint.resolved_at:
                complaint.resolved_at = timezone.now()
            complaint.save()
        
        log_admin_action(request, 'complaint_resolve', 'complaint', complaint_id, {
            'issue_type': complaint.issue_type,
            'user_name': complaint.user_name,
        })
        logger.info(f'Complaint #{complaint_id} resolved by {request.supabase_user.get("user_id")}')
        return Response(ComplaintSerializer(complaint).data)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

