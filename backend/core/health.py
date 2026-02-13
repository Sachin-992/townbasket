"""
Enhanced health check endpoint.
Verifies DB connectivity, cache, and Supabase JWKS reachability.
"""
import logging
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.db import connection
from django.core.cache import cache

logger = logging.getLogger('townbasket_backend')


@api_view(['GET'])
def health_check(request):
    """
    Production health check endpoint.
    Returns detailed status of all system dependencies.
    
    GET /api/health/
    """
    checks = {
        'status': 'healthy',
        'database': 'unknown',
        'cache': 'unknown',
        'jwks': 'unknown',
    }
    overall_healthy = True

    # 1. Database connectivity
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
            cursor.fetchone()
        checks['database'] = 'connected'
    except Exception as e:
        checks['database'] = f'error: {str(e)[:100]}'
        overall_healthy = False
        logger.error(f'Health check: DB connection failed: {e}')

    # 2. Cache connectivity
    try:
        cache.set('_health_check', 'ok', 10)
        val = cache.get('_health_check')
        if val == 'ok':
            checks['cache'] = 'connected'
        else:
            checks['cache'] = 'error: cache set/get mismatch'
            overall_healthy = False
    except Exception as e:
        checks['cache'] = f'error: {str(e)[:100]}'
        overall_healthy = False
        logger.error(f'Health check: Cache connection failed: {e}')

    # 3. Supabase JWKS reachability
    try:
        from django.conf import settings as django_settings
        supabase_url = getattr(django_settings, 'SUPABASE_URL', '')
        if supabase_url:
            import urllib.request
            jwks_url = f"{supabase_url}/auth/v1/.well-known/jwks.json"
            req = urllib.request.Request(jwks_url, method='GET')
            req.add_header('Accept', 'application/json')
            with urllib.request.urlopen(req, timeout=5) as resp:
                if resp.status == 200:
                    checks['jwks'] = 'reachable'
                else:
                    checks['jwks'] = f'error: status {resp.status}'
                    overall_healthy = False
        else:
            checks['jwks'] = 'not_configured'
    except Exception as e:
        checks['jwks'] = f'error: {str(e)[:100]}'
        # JWKS unreachable is a warning, not a hard failure
        logger.warning(f'Health check: JWKS unreachable: {e}')

    if not overall_healthy:
        checks['status'] = 'degraded'
        return Response(checks, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    return Response(checks, status=status.HTTP_200_OK)
