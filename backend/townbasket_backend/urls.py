"""
URL configuration for townbasket_backend project.
"""
from django.contrib import admin
from django.urls import path, include
from core.health import health_check
from core.urls import admin_urlpatterns


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health_check, name='health_check'),
    path('api/users/', include('users.urls')),
    path('api/shops/', include('shops.urls')),
    path('api/products/', include('products.urls')),
    path('api/orders/', include('orders.urls')),
    path('api/complaints/', include('complaints.urls')),
    path('api/core/', include('core.urls')),
    path('api/admin/', include(admin_urlpatterns)),
]


