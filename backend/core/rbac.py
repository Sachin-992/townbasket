"""
RBAC Permission Model
─────────────────────
Granular permission system layered on top of require_role.

Roles:  admin, moderator, viewer
Each role maps to a set of permissions. Views use @require_permission('...')
to enforce fine-grained access. The frontend fetches the user's permissions
via GET /admin/permissions/ to gate UI elements.

Permissions follow the format: resource.action
  e.g., orders.view, orders.export, users.manage, fraud.action, settings.update
"""
import logging
from functools import wraps
from django.http import JsonResponse
from rest_framework.decorators import api_view
from rest_framework.response import Response
from townbasket_backend.middleware import require_auth, require_role

logger = logging.getLogger('townbasket_backend')

# ── Permission Definitions ──────────────────────────
ROLE_PERMISSIONS = {
    'admin': [
        # Full access
        'overview.view',
        'analytics.view', 'analytics.export',
        'users.view', 'users.manage', 'users.export',
        'orders.view', 'orders.manage', 'orders.export',
        'shops.view', 'shops.manage', 'shops.approve', 'shops.export',
        'delivery.view', 'delivery.manage',
        'complaints.view', 'complaints.resolve',
        'categories.view', 'categories.manage',
        'fraud.view', 'fraud.action', 'fraud.scan',
        'audit.view', 'audit.export',
        'settings.view', 'settings.update',
        'notifications.view', 'notifications.manage',
        'bulk.execute',
        'system.health', 'system.search',
    ],
    'moderator': [
        # Read + limited write
        'overview.view',
        'analytics.view',
        'users.view',
        'orders.view', 'orders.manage',
        'shops.view', 'shops.approve',
        'delivery.view',
        'complaints.view', 'complaints.resolve',
        'categories.view',
        'fraud.view',
        'audit.view',
        'notifications.view',
        'system.health', 'system.search',
    ],
    'viewer': [
        # Read-only
        'overview.view',
        'analytics.view',
        'users.view',
        'orders.view',
        'shops.view',
        'delivery.view',
        'complaints.view',
        'categories.view',
        'fraud.view',
        'audit.view',
        'notifications.view',
        'system.health',
    ],
}

# Flat set for validation
ALL_PERMISSIONS = set()
for perms in ROLE_PERMISSIONS.values():
    ALL_PERMISSIONS.update(perms)


def get_admin_role(request):
    """
    Resolve the admin sub-role from user metadata.
    Falls back to 'admin' (full access) if not specified.
    """
    user = getattr(request, 'supabase_user', {})
    metadata = user.get('user_metadata', {})
    role = metadata.get('admin_role', 'admin')
    return role if role in ROLE_PERMISSIONS else 'admin'


def get_permissions_for_role(role):
    """Return the permission set for a given role."""
    return set(ROLE_PERMISSIONS.get(role, []))


def has_permission(request, permission):
    """Check if the current request user has a specific permission."""
    role = get_admin_role(request)
    return permission in get_permissions_for_role(role)


def require_permission(*permissions):
    """
    Decorator to require specific permission(s).
    User must have ALL listed permissions.

    Usage:
        @require_auth
        @require_role('admin')
        @require_permission('orders.export')
        def export_orders(request):
            ...
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            role = get_admin_role(request)
            user_perms = get_permissions_for_role(role)

            missing = [p for p in permissions if p not in user_perms]
            if missing:
                uid = getattr(request, 'supabase_user', {}).get('user_id', '')
                logger.warning(
                    f"Permission denied for {uid} (role={role}): "
                    f"missing {missing}"
                )
                return JsonResponse(
                    {
                        'error': 'Insufficient permissions',
                        'missing': missing,
                        'code': 'PERMISSION_DENIED',
                    },
                    status=403
                )
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator


# ── API: Fetch current user's permissions ────────────

@api_view(['GET'])
@require_auth
@require_role('admin')
def admin_permissions(request):
    """
    Return the current admin user's role and permissions.
    GET /admin/permissions/
    """
    role = get_admin_role(request)
    perms = sorted(get_permissions_for_role(role))

    return Response({
        'role': role,
        'permissions': perms,
    })
