from django.urls import path
from . import views

urlpatterns = [
    path('seller/', views.seller_orders, name='seller_orders'),
    path('customer/', views.customer_orders, name='customer_orders'),
    path('delivery/', views.delivery_orders, name='delivery_orders'),
    path('all/', views.all_orders, name='all_orders'),
    path('create/', views.create_order, name='create_order'),
    path('<int:order_id>/', views.order_detail, name='order_detail'),
    path('<int:order_id>/status/', views.update_order_status, name='update_order_status'),
    path('<int:order_id>/accept-delivery/', views.accept_delivery, name='accept_delivery'),
    path('delivery/stats/', views.delivery_stats, name='delivery_stats'),
]
