"""
Server-Sent Events (SSE) endpoint for real-time seller order notifications.

This is a sync-compatible SSE implementation that works with Django + Gunicorn.
For high concurrency (100+ concurrent sellers), switch to async with Uvicorn/Daphne.

Usage:
  GET /api/orders/seller/sse/?shop_id=<id>
  
  EventSource in frontend:
  const es = new EventSource('/api/orders/seller/sse/?shop_id=1', {
    headers: { 'Authorization': 'Bearer <token>' }
  });
  es.onmessage = (e) => { const data = JSON.parse(e.data); ... };
"""
import json
import time
import logging
from django.http import StreamingHttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from orders.models import Order
from shops.models import Shop
from townbasket_backend.middleware import get_supabase_user

logger = logging.getLogger('townbasket_backend')

# Poll interval in seconds (adjust for load vs latency tradeoff)
SSE_POLL_INTERVAL = 5
SSE_MAX_DURATION = 300  # 5 minutes max connection


@csrf_exempt
def seller_order_sse(request):
    """
    SSE endpoint that streams new orders to a seller in real-time.
    
    The seller must be authenticated and own the requested shop.
    Polls the DB every SSE_POLL_INTERVAL seconds for new orders.
    Connection auto-closes after SSE_MAX_DURATION seconds.
    """
    # Authenticate
    user = get_supabase_user(request)
    if not user or 'error' in user:
        return StreamingHttpResponse(
            _sse_error('Authentication required'),
            content_type='text/event-stream',
            status=401,
        )
    
    user_id = user.get('user_id') or user.get('sub')
    shop_id = request.GET.get('shop_id')
    
    if not shop_id:
        return StreamingHttpResponse(
            _sse_error('shop_id parameter required'),
            content_type='text/event-stream',
            status=400,
        )
    
    # Verify shop ownership
    try:
        shop = Shop.objects.get(id=shop_id)
        if shop.owner_supabase_uid != user_id:
            return StreamingHttpResponse(
                _sse_error('Not your shop'),
                content_type='text/event-stream',
                status=403,
            )
    except Shop.DoesNotExist:
        return StreamingHttpResponse(
            _sse_error('Shop not found'),
            content_type='text/event-stream',
            status=404,
        )
    
    response = StreamingHttpResponse(
        _order_stream(shop_id),
        content_type='text/event-stream',
    )
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no'  # Disable nginx buffering
    return response


def _order_stream(shop_id):
    """Generator that yields SSE events for new orders."""
    last_check = time.time()
    start_time = time.time()
    last_order_id = None
    
    # Get the latest order ID as baseline
    latest = Order.objects.filter(shop_id=shop_id).order_by('-id').first()
    if latest:
        last_order_id = latest.id
    
    # Send initial heartbeat
    yield _sse_event({'type': 'connected', 'shop_id': int(shop_id)})
    
    while True:
        elapsed = time.time() - start_time
        if elapsed > SSE_MAX_DURATION:
            yield _sse_event({'type': 'timeout', 'message': 'Connection expired, please reconnect'})
            break
        
        try:
            # Check for new orders since last check
            new_orders_qs = Order.objects.filter(
                shop_id=shop_id,
            ).select_related('shop').order_by('-id')
            
            if last_order_id:
                new_orders_qs = new_orders_qs.filter(id__gt=last_order_id)
            
            new_orders = list(new_orders_qs[:10])  # Process max 10 at a time
            
            if new_orders:
                last_order_id = new_orders[0].id
                for order in new_orders:
                    yield _sse_event({
                        'type': 'new_order',
                        'order': {
                            'id': order.id,
                            'order_number': order.order_number,
                            'status': order.status,
                            'total': str(order.total),
                            'payment_method': order.payment_method,
                            'created_at': order.created_at.isoformat(),
                            'items_count': order.items.count(),
                        }
                    })
            
            # Send heartbeat every 30 seconds
            if time.time() - last_check > 30:
                yield _sse_event({'type': 'heartbeat'})
                last_check = time.time()
            
        except Exception as e:
            logger.error(f'SSE stream error for shop {shop_id}: {e}')
            yield _sse_event({'type': 'error', 'message': 'Internal error'})
            break
        
        time.sleep(SSE_POLL_INTERVAL)


def _sse_event(data):
    """Format data as an SSE event string."""
    return f"data: {json.dumps(data)}\n\n"


def _sse_error(message):
    """Generator for SSE error responses."""
    yield f"data: {json.dumps({'type': 'error', 'message': message})}\n\n"
