"""
Bulk Action API endpoints for the Operational Intelligence Control Center.

Endpoints:
  - POST /admin/bulk/shops/     — Batch approve/reject shops
  - POST /admin/bulk/users/     — Batch toggle user status
"""
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction

from townbasket_backend.middleware import require_auth, require_role
from .admin_security import require_admin_verify
from shops.models import Shop
from users.models import User
from .admin_views import log_admin_action
from .rate_limit import rate_limit


@api_view(['POST'])
@require_auth
@require_role('admin')
@require_admin_verify
@rate_limit(max_requests=10, window_seconds=60, key_prefix='admin_bulk')
def bulk_shops(request):
    """
    Batch approve or reject shops.
    
    Body:
        action: 'approve' | 'reject'
        ids: [1, 2, 3, ...]
    """
    action = request.data.get('action')
    ids = request.data.get('ids', [])

    if action not in ('approve', 'reject'):
        return Response(
            {'error': 'action must be "approve" or "reject"'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not ids or not isinstance(ids, list):
        return Response(
            {'error': 'ids must be a non-empty list'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if len(ids) > 100:
        return Response(
            {'error': 'Maximum 100 items per batch'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    new_status = 'approved' if action == 'approve' else 'rejected'
    results = {'updated': 0, 'skipped': 0, 'errors': []}

    with transaction.atomic():
        shops = Shop.objects.filter(id__in=ids).select_for_update()
        
        for shop in shops:
            try:
                old_status = shop.status
                shop.status = new_status
                if new_status == 'approved':
                    shop.is_active = True
                shop.save()
                results['updated'] += 1
            except Exception as e:
                results['errors'].append({
                    'id': shop.id,
                    'name': shop.name,
                    'error': str(e),
                })
                results['skipped'] += 1

    # Log the bulk action
    audit_action = f'bulk_shop_{action}'
    log_admin_action(
        request, audit_action, 'shop', '',
        details={
            'ids': ids,
            'count': results['updated'],
            'action': action,
        }
    )

    return Response({
        'action': action,
        'results': results,
    })


@api_view(['POST'])
@require_auth
@require_role('admin')
@require_admin_verify
@rate_limit(max_requests=10, window_seconds=60, key_prefix='admin_bulk')
def bulk_users(request):
    """
    Batch toggle user active status.
    
    Body:
        action: 'activate' | 'deactivate'
        ids: [1, 2, 3, ...]
    """
    action = request.data.get('action')
    ids = request.data.get('ids', [])

    if action not in ('activate', 'deactivate'):
        return Response(
            {'error': 'action must be "activate" or "deactivate"'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not ids or not isinstance(ids, list):
        return Response(
            {'error': 'ids must be a non-empty list'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if len(ids) > 100:
        return Response(
            {'error': 'Maximum 100 items per batch'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    new_active = action == 'activate'
    results = {'updated': 0, 'skipped': 0, 'errors': []}

    with transaction.atomic():
        users = User.objects.filter(id__in=ids).exclude(role='admin').select_for_update()

        for user in users:
            try:
                user.is_active = new_active
                user.save()
                results['updated'] += 1
            except Exception as e:
                results['errors'].append({
                    'id': user.id,
                    'name': user.name,
                    'error': str(e),
                })
                results['skipped'] += 1

    log_admin_action(
        request, 'bulk_user_toggle', 'user', '',
        details={
            'ids': ids,
            'count': results['updated'],
            'action': action,
        }
    )

    return Response({
        'action': action,
        'results': results,
    })
