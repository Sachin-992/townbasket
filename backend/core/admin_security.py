"""
Admin Security Module
─────────────────────
Tightened CSP for admin routes, two-factor verification decorator,
session hardening, and rate-limit utilities.

Usage:
    @require_auth
    @require_role('admin')
    @require_admin_verify          # Checks X-Admin-Verify-Token header
    def sensitive_action(request):
        ...
"""
import hashlib
import hmac
import time
import logging
from functools import wraps
from django.conf import settings
from django.core.cache import cache
from django.http import JsonResponse
from rest_framework.decorators import api_view

from townbasket_backend.middleware import require_auth, require_role
from .rate_limit import rate_limit

logger = logging.getLogger('townbasket_backend')

# ── Admin CSP Policy ────────────────────────────────
# Tighter than the default CSP — no inline scripts, strict connect-src
ADMIN_CSP_POLICY = (
    "default-src 'self'; "
    "script-src 'self'; "
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
    "font-src 'self' https://fonts.gstatic.com; "
    "img-src 'self' data: https:; "
    "connect-src 'self' https://*.supabase.co; "
    "frame-ancestors 'none'; "
    "base-uri 'self'; "
    "form-action 'self';"
)


class AdminCSPMiddleware:
    """
    Apply tighter CSP headers specifically for admin routes.
    Place AFTER SecurityHeadersMiddleware in MIDDLEWARE list.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Only tighten for admin API routes
        if request.path.startswith('/api/admin/'):
            response['Content-Security-Policy'] = ADMIN_CSP_POLICY
            # Prevent caching of sensitive admin responses
            response['Cache-Control'] = 'no-store, no-cache, must-revalidate, private'
            response['Pragma'] = 'no-cache'

        return response


# ── Two-Factor Admin Verification ───────────────────
# Uses TOTP-like token verification via cache

def _generate_admin_token(admin_uid):
    """Generate a time-based admin verification token."""
    secret = getattr(settings, 'SECRET_KEY', 'fallback-secret')
    timestamp = int(time.time()) // 300  # 5-minute window
    msg = f"{admin_uid}:{timestamp}".encode()
    return hmac.new(secret.encode(), msg, hashlib.sha256).hexdigest()[:12]


def require_admin_verify(view_func):
    """
    Decorator that requires an additional admin verification token
    for sensitive operations (bulk actions, permission changes, etc.).

    The frontend should include X-Admin-Verify-Token header.
    Token is generated via POST /api/admin/request-verify/ and valid for 5 min.
    """
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        admin_uid = getattr(request, 'supabase_user', {}).get('user_id', '')
        if not admin_uid:
            return JsonResponse({'error': 'Authentication required'}, status=401)

        token = request.META.get('HTTP_X_ADMIN_VERIFY_TOKEN', '')

        # Check if token exists in cache (set when admin requests verification)
        cache_key = f'admin_verify:{admin_uid}'
        stored_token = cache.get(cache_key)

        if not stored_token or not hmac.compare_digest(str(stored_token), str(token)):
            return JsonResponse(
                {'error': 'Admin verification required', 'code': 'VERIFY_REQUIRED'},
                status=403
            )

        return view_func(request, *args, **kwargs)

    return wrapper


@api_view(['POST'])
@require_auth
@require_role('admin')
@rate_limit(max_requests=5, window_seconds=300, key_prefix='admin_verify')
def issue_admin_verify_token(request):
    """
    Issue a verification token for the current admin.
    Token is cached for 5 minutes.

    POST /api/admin/request-verify/
    """
    admin_uid = getattr(request, 'supabase_user', {}).get('user_id', '')
    if not admin_uid:
        return JsonResponse({'error': 'Authentication required'}, status=401)

    token = _generate_admin_token(admin_uid)
    cache_key = f'admin_verify:{admin_uid}'
    cache.set(cache_key, token, timeout=300)  # 5 minutes

    return JsonResponse({'verify_token': token, 'expires_in': 300})


# ── Session Hardening ───────────────────────────────

def check_admin_session_integrity(request):
    """
    Verify that the admin session hasn't been hijacked.
    Checks: same IP, same user-agent within a session window.
    """
    admin_uid = getattr(request, 'supabase_user', {}).get('user_id', '')
    if not admin_uid:
        return True  # Skip for unauthenticated

    session_key = f'admin_session:{admin_uid}'
    session = cache.get(session_key)
    current_ip = request.META.get('REMOTE_ADDR', '')
    current_ua = request.META.get('HTTP_USER_AGENT', '')[:200]

    if session is None:
        # First request — establish session fingerprint
        cache.set(session_key, {
            'ip': current_ip,
            'ua_hash': hashlib.md5(current_ua.encode()).hexdigest(),
        }, timeout=3600)
        return True

    # Compare fingerprints
    if session.get('ip') != current_ip:
        logger.warning(
            f"Admin session IP mismatch for {admin_uid}: "
            f"expected {session.get('ip')}, got {current_ip}"
        )
        return False

    ua_hash = hashlib.md5(current_ua.encode()).hexdigest()
    if session.get('ua_hash') != ua_hash:
        logger.warning(f"Admin session UA mismatch for {admin_uid}")
        return False

    return True


# ── Suspicious Activity Detection ───────────────────

def suspicious_activity_check(request, action_type='general'):
    """
    Track admin action frequency and flag suspicious patterns.
    Returns True if suspicious (too many actions in a window).
    """
    admin_uid = getattr(request, 'supabase_user', {}).get('user_id', '')
    if not admin_uid:
        return False

    window = 300  # 5 minutes
    cache_key = f'admin_actions:{admin_uid}:{action_type}'
    count = cache.get(cache_key, 0) + 1
    cache.set(cache_key, count, timeout=window)

    thresholds = {
        'general': 200,
        'bulk': 20,
        'export': 10,
        'fraud_action': 50,
        'settings': 15,
    }

    threshold = thresholds.get(action_type, 100)
    if count > threshold:
        logger.warning(
            f"Suspicious admin activity: {admin_uid} performed "
            f"{count} '{action_type}' actions in {window}s (threshold: {threshold})"
        )
        return True

    return False
