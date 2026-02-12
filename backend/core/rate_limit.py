"""
Rate limiting decorators for admin endpoints.
Uses a simple in-memory cache-based approach.
For production at scale, consider django-ratelimit or Redis-backed throttling.
"""
import time
import logging
from functools import wraps
from django.core.cache import cache
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger('townbasket_backend')


def rate_limit(max_requests=60, window_seconds=60, key_prefix='rl'):
    """
    Decorator that limits the number of requests per admin user per time window.

    @rate_limit(max_requests=60, window_seconds=60)
    def my_view(request): ...
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            user = getattr(request, 'supabase_user', {})
            uid = user.get('sub', user.get('user_id', 'anon'))
            cache_key = f'{key_prefix}:{uid}:{view_func.__name__}'

            try:
                data = cache.get(cache_key)
                now = time.time()

                if data is None:
                    data = {'count': 1, 'window_start': now}
                else:
                    # Reset window if expired
                    if now - data['window_start'] > window_seconds:
                        data = {'count': 1, 'window_start': now}
                    else:
                        data['count'] += 1

                if data['count'] > max_requests:
                    remaining = window_seconds - (now - data['window_start'])
                    logger.warning(
                        f'Rate limit exceeded: {uid} on {view_func.__name__} '
                        f'({data["count"]}/{max_requests} in {window_seconds}s)'
                    )
                    return Response(
                        {
                            'error': 'Rate limit exceeded',
                            'retry_after': round(remaining),
                        },
                        status=status.HTTP_429_TOO_MANY_REQUESTS,
                        headers={'Retry-After': str(round(remaining))},
                    )

                cache.set(cache_key, data, timeout=window_seconds)
            except Exception:
                # If cache is down, fail open (don't block requests)
                pass

            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator


def suspicious_activity_check(request, action_name):
    """
    Check if an admin is making an unusual number of actions.
    Logs a warning if >50 actions in the last hour.
    """
    user = getattr(request, 'supabase_user', {})
    uid = user.get('sub', user.get('user_id', 'anon'))
    cache_key = f'admin_activity:{uid}'

    try:
        data = cache.get(cache_key)
        now = time.time()

        if data is None:
            data = {'count': 1, 'window_start': now}
        else:
            if now - data['window_start'] > 3600:  # 1 hour window
                data = {'count': 1, 'window_start': now}
            else:
                data['count'] += 1

        cache.set(cache_key, data, timeout=3600)

        if data['count'] > 50:
            logger.warning(
                f'Suspicious admin activity: {uid} performed {data["count"]} '
                f'actions in the last hour (latest: {action_name})'
            )
            # In production, this would also send to Sentry
            return True

    except Exception:
        pass

    return False
