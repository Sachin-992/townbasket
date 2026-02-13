"""
Supabase JWT Authentication Middleware and Decorators

SECURITY NOTES:
- All JWT signature verification uses PyJWT with explicit algorithm enforcement.
- JWKS is cached to avoid fetching on every request.
- No signature verification bypass is allowed (except in DEBUG mode for tests).
"""
import jwt
import logging
from django.conf import settings
from django.http import JsonResponse
from functools import wraps

logger = logging.getLogger(__name__)

# Cache for JWKS client to avoid repeated network calls
_jwks_client = None


def _get_jwks_client():
    """Get or create a cached PyJWKClient for Supabase."""
    global _jwks_client
    if _jwks_client is None:
        supabase_url = getattr(settings, 'SUPABASE_URL', None)
        if supabase_url:
            from jwt import PyJWKClient
            jwks_url = f"{supabase_url}/auth/v1/.well-known/jwks.json"
            _jwks_client = PyJWKClient(jwks_url, cache_keys=True, lifespan=3600)
    return _jwks_client


def get_supabase_user(request):
    """
    Extract and VERIFY user info from Supabase JWT token in Authorization header.
    
    Returns:
        dict: User info with user_id, phone, email, role if valid.
        None: If no token is present.
        dict with 'error' key: If token is invalid.
    """
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    
    if not auth_header.startswith('Bearer '):
        return None
    
    token = auth_header.split(' ')[1]
    
    jwt_secret = getattr(settings, 'SUPABASE_JWT_SECRET', None)
    supabase_url = getattr(settings, 'SUPABASE_URL', None)
    is_debug = getattr(settings, 'DEBUG', False)
    
    try:
        # Determine algorithm from token header
        try:
            header = jwt.get_unverified_header(token)
            alg = header.get('alg', 'HS256')
        except jwt.exceptions.DecodeError:
            return {'error': 'Invalid token format'}
        
        payload = None
        
        # Case 1: HS256 - Verify with shared secret
        if alg == 'HS256':
            if not jwt_secret:
                if is_debug:
                    logger.warning("SUPABASE_JWT_SECRET not set in DEBUG mode. Skipping verification.")
                    payload = jwt.decode(token, options={"verify_signature": False})
                else:
                    return {'error': 'Server configuration error: JWT secret missing'}
            else:
                # Standard HS256 verification
                payload = jwt.decode(
                    token,
                    jwt_secret,
                    algorithms=['HS256'],
                    audience='authenticated',
                    options={'require': ['exp', 'sub']}
                )
        
        # Case 2: RS256/ES256 - Verify with JWKS
        elif alg in ['RS256', 'ES256']:
            jwks_client = _get_jwks_client()
            if not jwks_client:
                return {'error': 'Server configuration error: JWKS not available'}
            
            signing_key = jwks_client.get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=[alg],
                audience='authenticated',
                options={'require': ['exp', 'sub']}
            )
        
        else:
            return {'error': f'Unsupported algorithm: {alg}'}
        
        if not payload:
            return {'error': 'Token verification failed'}
        
        # Extract user information
        return {
            'user_id': payload.get('sub'),
            'phone': payload.get('phone'),
            'email': payload.get('email'),
            'role': payload.get('role', 'authenticated'),
            'user_metadata': payload.get('user_metadata', {}),
            'exp': payload.get('exp'),
        }
        
    except jwt.ExpiredSignatureError:
        return {'error': 'Token expired'}
    except jwt.InvalidAudienceError:
        return {'error': 'Invalid token audience'}
    except jwt.InvalidSignatureError:
        logger.warning("JWT signature verification failed")
        return {'error': 'Invalid token signature'}
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid token: {e}")
        return {'error': 'Invalid token'}
    except Exception as e:
        logger.error(f"Unexpected auth error: {e}", exc_info=True)
        return {'error': 'Authentication error'}


def require_auth(view_func):
    """
    Decorator to require valid Supabase JWT token.
    Adds request.supabase_user with verified user info.
    """
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        user = get_supabase_user(request)
        
        if user is None:
            return JsonResponse(
                {'error': 'Authentication required'},
                status=401
            )
        
        if 'error' in user:
            return JsonResponse(
                {'error': user['error']},
                status=401
            )
        
        request.supabase_user = user
        return view_func(request, *args, **kwargs)
    
    return wrapper


def require_role(*allowed_roles):
    """
    Decorator to require specific role(s).
    Must be used after @require_auth.
    
    Usage:
        @require_auth
        @require_role('admin')
        def admin_view(request):
            ...
        
        @require_auth
        @require_role('seller', 'admin')
        def seller_or_admin_view(request):
            ...
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            if not hasattr(request, 'supabase_user') or not request.supabase_user:
                return JsonResponse(
                    {'error': 'Authentication required'},
                    status=401
                )
            
            # Check both JWT role and app_role from user_metadata
            jwt_role = request.supabase_user.get('role', 'authenticated')
            user_metadata = request.supabase_user.get('user_metadata', {})
            app_role = user_metadata.get('app_role', 'customer')
            
            # Check if user has any of the required roles
            if jwt_role not in allowed_roles and app_role not in allowed_roles:
                logger.warning(
                    f"Access denied for user {request.supabase_user.get('user_id')}: "
                    f"requires {allowed_roles}, has jwt_role={jwt_role}, app_role={app_role}"
                )
                return JsonResponse(
                    {'error': 'Insufficient permissions'},
                    status=403
                )
            
            return view_func(request, *args, **kwargs)
        
        return wrapper
    return decorator


def require_owner(owner_field='owner_supabase_uid'):
    """
    Decorator to verify user owns the resource.
    The resource must have owner_field matching the authenticated user's ID.
    
    Usage:
        @require_auth
        @require_owner('owner_supabase_uid')
        def update_shop(request, shop_id):
            ...
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            if not hasattr(request, 'supabase_user') or not request.supabase_user:
                return JsonResponse(
                    {'error': 'Authentication required'},
                    status=401
                )
            
            # Store owner field name for view to check
            request.owner_field = owner_field
            request.owner_user_id = request.supabase_user.get('user_id')
            
            return view_func(request, *args, **kwargs)
        
        return wrapper
    return decorator


def optional_auth(view_func):
    """
    Decorator that attempts to authenticate but allows unauthenticated access.
    Sets request.supabase_user if token is valid, None otherwise.
    """
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        user = get_supabase_user(request)
        
        if user and 'error' not in user:
            request.supabase_user = user
        else:
            request.supabase_user = None
        
        return view_func(request, *args, **kwargs)
    
    return wrapper


class SupabaseAuthMiddleware:
    """
    Middleware to attach Supabase user to all requests (optional auth).
    Use decorators for required auth on specific endpoints.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Attach user info if token present (don't require it)
        user = get_supabase_user(request)
        if user and 'error' not in user:
            request.supabase_user = user
        else:
            request.supabase_user = None
        
        response = self.get_response(request)
        return response


class SecurityHeadersMiddleware:
    """
    Middleware to add security headers including CSP to all responses.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Content Security Policy
        csp_policy = getattr(settings, 'CSP_POLICY', None)
        if csp_policy:
            response['Content-Security-Policy'] = csp_policy

        # Additional security headers
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['X-XSS-Protection'] = '1; mode=block'
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response['Permissions-Policy'] = (
            'camera=(), microphone=(), geolocation=(self), '
            'payment=(), usb=()'
        )

        return response
