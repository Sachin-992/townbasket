"""
Cache Utilities — Invalidation, key generation, and circuit breaker.
────────────────────────────────────────────────────────────────────
Used by admin views and analytics to manage cache lifecycle.

Usage:
    from core.cache_utils import analytics_cache, invalidate_analytics

    @analytics_cache(timeout=120, key_prefix='top_products')
    def top_products(request):
        ...

    # After order create/update:
    invalidate_analytics()
"""
import functools
import hashlib
import logging
import time

from django.core.cache import cache
from django.http import JsonResponse

logger = logging.getLogger('townbasket_backend')


# ── Cache Key Builder ────────────────────────────
def _build_cache_key(prefix, request):
    """Build a deterministic cache key from prefix + query params."""
    params = sorted(request.GET.items())
    raw = f"{prefix}:{params}"
    return f"analytics:{hashlib.md5(raw.encode()).hexdigest()}"


# ── Analytics Cache Decorator ────────────────────
def analytics_cache(timeout=120, key_prefix='analytics'):
    """
    Cache decorator for analytics endpoints.
    - Builds key from prefix + query params
    - 120s TTL default
    - Fails open (returns live data if cache unavailable)
    """
    def decorator(view_func):
        @functools.wraps(view_func)
        def wrapper(request, *args, **kwargs):
            cache_key = _build_cache_key(key_prefix, request)
            try:
                cached = cache.get(cache_key)
                if cached is not None:
                    return cached
            except Exception:
                pass  # Cache failure → fall through to live query

            response = view_func(request, *args, **kwargs)

            try:
                if hasattr(response, 'status_code') and response.status_code == 200:
                    cache.set(cache_key, response, timeout=timeout)
            except Exception:
                pass  # Cache write failure is non-fatal

            return response
        return wrapper
    return decorator


# ── Bulk Invalidation ────────────────────────────
# Analytics cache keys use 'analytics:' prefix → wildcard delete
ANALYTICS_KEY_PATTERNS = [
    'analytics:*',
    'admin:overview:*',
    'admin:shops_stats:*',
    'admin:orders_stats:*',
]


def invalidate_analytics():
    """
    Invalidate all analytics caches.
    Call after order create/update, shop status change, etc.
    """
    try:
        # django-redis supports delete_pattern; LocMemCache does not
        if hasattr(cache, 'delete_pattern'):
            for pattern in ANALYTICS_KEY_PATTERNS:
                cache.delete_pattern(pattern)
            logger.info('Analytics cache invalidated (pattern delete)')
        else:
            # Fallback: delete known keys
            cache.clear()
            logger.info('Analytics cache invalidated (full clear)')
    except Exception as e:
        logger.warning(f'Cache invalidation failed: {e}')


def invalidate_shop_metrics():
    """Invalidate shop-related caches after shop update."""
    try:
        for key in ['admin:shops_stats:v1', 'admin:overview:v2']:
            cache.delete(key)
    except Exception:
        pass


def invalidate_order_metrics():
    """Invalidate order-related caches after order create/update."""
    try:
        for key in ['admin:orders_stats:v1', 'admin:overview:v2']:
            cache.delete(key)
        invalidate_analytics()
    except Exception:
        pass


# ── Circuit Breaker ──────────────────────────────
class CircuitBreaker:
    """
    Simple circuit breaker for analytics endpoints.
    Opens after `threshold` failures in `window` seconds.
    When open, returns cached data or a 503 fallback.
    """
    def __init__(self, name, threshold=5, window=60, cooldown=30):
        self.name = name
        self.threshold = threshold
        self.window = window
        self.cooldown = cooldown
        self._cache_key = f'circuit:{name}'

    def _get_state(self):
        return cache.get(self._cache_key, {'failures': 0, 'last_failure': 0, 'open': False})

    def is_open(self):
        state = self._get_state()
        if not state.get('open'):
            return False
        # Check if cooldown has elapsed
        if time.time() - state.get('last_failure', 0) > self.cooldown:
            state['open'] = False
            state['failures'] = 0
            cache.set(self._cache_key, state, timeout=self.window)
            return False
        return True

    def record_failure(self):
        state = self._get_state()
        state['failures'] = state.get('failures', 0) + 1
        state['last_failure'] = time.time()
        if state['failures'] >= self.threshold:
            state['open'] = True
            logger.warning(f'Circuit breaker OPEN: {self.name}')
        cache.set(self._cache_key, state, timeout=self.window)

    def record_success(self):
        try:
            cache.delete(self._cache_key)
        except Exception:
            pass


# Pre-built circuit breakers for critical paths
analytics_circuit = CircuitBreaker('analytics', threshold=5, window=60, cooldown=30)
overview_circuit = CircuitBreaker('overview', threshold=3, window=60, cooldown=20)


def with_circuit_breaker(circuit, fallback_cache_key=None):
    """
    Decorator that wraps a view with circuit breaker logic.
    If circuit is open, returns last cached response or 503.
    """
    def decorator(view_func):
        @functools.wraps(view_func)
        def wrapper(request, *args, **kwargs):
            if circuit.is_open():
                # Try returning stale cached data
                if fallback_cache_key:
                    stale = cache.get(fallback_cache_key)
                    if stale is not None:
                        return stale
                return JsonResponse(
                    {'error': 'Service temporarily unavailable', 'retry_after': circuit.cooldown},
                    status=503,
                )
            try:
                response = view_func(request, *args, **kwargs)
                circuit.record_success()
                return response
            except Exception as e:
                circuit.record_failure()
                logger.error(f'Circuit breaker failure in {view_func.__name__}: {e}')
                # Try returning stale cached data as fallback
                if fallback_cache_key:
                    stale = cache.get(fallback_cache_key)
                    if stale is not None:
                        return stale
                raise
        return wrapper
    return decorator
