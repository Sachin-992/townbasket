"""
Async SSE endpoint for ASGI deployment.
────────────────────────────────────────
Replaces the sync thread-per-connection SSE with an async view
when running under Uvicorn/Daphne.

Supports 200+ concurrent connections vs WSGI's ~50 limit.

Usage in urls.py:
    # Under ASGI
    from core.admin_sse_async import admin_sse_async
    path('api/admin/sse-async/', admin_sse_async),

    # Keep sync SSE as fallback for WSGI deployments
"""
import asyncio
import json
import time
import logging

from django.http import StreamingHttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from django.core.cache import cache
from datetime import timedelta

logger = logging.getLogger('townbasket_backend')

# ── Configuration ─────────────────────────────────
SSE_POLL_INTERVAL = 3
SSE_HEARTBEAT_INTERVAL = 15
SSE_MAX_DURATION = 600  # 10 min max
SSE_MAX_CONNECTIONS = 200  # async can handle more
SSE_RECONNECT_BASE = 1000  # ms
SSE_RECONNECT_MAX = 30000  # ms

# ── Connection counter (atomic via cache) ─────────
def _get_conn_count():
    return cache.get('sse:conn_count', 0)

def _inc_conn():
    try:
        return cache.incr('sse:conn_count')
    except ValueError:
        cache.set('sse:conn_count', 1, timeout=SSE_MAX_DURATION + 60)
        return 1

def _dec_conn():
    try:
        val = cache.decr('sse:conn_count')
        if val < 0:
            cache.set('sse:conn_count', 0, timeout=SSE_MAX_DURATION + 60)
        return max(val, 0)
    except ValueError:
        return 0


def _sse_event(event_type, data, event_id=None):
    """Format a single SSE event."""
    lines = []
    if event_id:
        lines.append(f"id: {event_id}")
    lines.append(f"event: {event_type}")
    lines.append(f"data: {json.dumps(data)}")
    lines.append("")
    lines.append("")
    return "\n".join(lines)


async def _async_stream(user_id):
    """
    Async generator yielding SSE events.
    Uses asyncio.sleep instead of time.sleep → no thread blocking.
    """
    start_time = time.time()
    event_id = 0
    last_heartbeat = time.time()
    reconnect_delay = SSE_RECONNECT_BASE

    try:
        # Initial connection event with exponential backoff hint
        yield _sse_event('connected', {
            'message': 'SSE async connected',
            'max_duration': SSE_MAX_DURATION,
            'reconnect_ms': reconnect_delay,
        }, event_id=str(event_id))
        event_id += 1

        # Set retry directive for browser reconnection
        yield f"retry: {SSE_RECONNECT_BASE}\n\n"

        while True:
            elapsed = time.time() - start_time
            if elapsed > SSE_MAX_DURATION:
                yield _sse_event('timeout', {'message': 'Connection timeout, please reconnect'}, event_id=str(event_id))
                break

            # Heartbeat
            now = time.time()
            if now - last_heartbeat >= SSE_HEARTBEAT_INTERVAL:
                yield _sse_event('heartbeat', {
                    'ts': int(now * 1000),
                    'uptime': round(elapsed, 1),
                    'connections': _get_conn_count(),
                }, event_id=str(event_id))
                event_id += 1
                last_heartbeat = now

            # Check for new data in cache (populated by Celery or signal)
            try:
                pending_events = cache.get(f'sse:events:{user_id}')
                if pending_events:
                    cache.delete(f'sse:events:{user_id}')
                    for evt in pending_events:
                        yield _sse_event(evt['type'], evt['data'], event_id=str(event_id))
                        event_id += 1
            except Exception:
                pass

            # Async sleep — does NOT block the event loop
            await asyncio.sleep(SSE_POLL_INTERVAL)

    finally:
        _dec_conn()
        logger.info(f'SSE async disconnected: {user_id}')


@csrf_exempt
async def admin_sse_async(request):
    """
    Async SSE endpoint for ASGI (Uvicorn/Daphne).
    Handles 200+ concurrent connections efficiently.
    """
    from townbasket_backend.middleware import get_supabase_user
    from users.models import User

    # Auth check
    user = get_supabase_user(request)
    if not user or 'error' in user:
        return StreamingHttpResponse(
            _sse_event('error', {'message': 'Authentication required'}),
            content_type='text/event-stream',
            status=401,
        )

    uid = user.get('user_id') or user.get('sub')
    try:
        from asgiref.sync import sync_to_async
        db_user = await sync_to_async(lambda: User.objects.filter(supabase_uid=uid).first())()
        if not db_user or db_user.role != 'admin':
            return StreamingHttpResponse(
                _sse_event('error', {'message': 'Admin access required'}),
                content_type='text/event-stream',
                status=403,
            )
    except Exception:
        return StreamingHttpResponse(
            _sse_event('error', {'message': 'Auth check failed'}),
            content_type='text/event-stream',
            status=500,
        )

    # Connection pool check (uses Redis for shared counting)
    current = _inc_conn()
    if current > SSE_MAX_CONNECTIONS:
        _dec_conn()
        return StreamingHttpResponse(
            _sse_event('error', {
                'message': 'Too many connections, please retry',
                'retry_ms': SSE_RECONNECT_MAX,
            }),
            content_type='text/event-stream',
            status=503,
        )

    response = StreamingHttpResponse(
        _async_stream(uid),
        content_type='text/event-stream',
    )
    response['Cache-Control'] = 'no-cache, no-store'
    response['X-Accel-Buffering'] = 'no'
    response['Connection'] = 'keep-alive'
    return response
