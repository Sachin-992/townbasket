"""
URL configuration for townbasket_backend project.
"""
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from shops import views


def health_check(request):
    """Health check endpoint for Railway/load balancers"""
    return JsonResponse({'status': 'healthy', 'service': 'townbasket-api'})


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health_check, name='health_check'),
    path('api/users/', include('users.urls')),
    path('api/shops/', include('shops.urls')),
    path('api/products/', include('products.urls')),
    path('api/orders/', include('orders.urls')),
    path('api/shops/<int:shop_id>/approve/', views.approve_shop, name='approve_shop'),
    path('api/shops/<int:shop_id>/reject/', views.reject_shop, name='reject_shop'),
    path('api/shops/<int:shop_id>/toggle-active/', views.toggle_shop_active, name='toggle_shop_active'),
    path('api/admin/stats/', views.get_admin_stats, name='admin_stats'),
    path('api/complaints/', include('complaints.urls')),
    path('api/core/', include('core.urls')),
]


