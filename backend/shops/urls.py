from django.urls import path
from . import views

urlpatterns = [
    path('categories/', views.list_categories, name='list_categories'),
    path('', views.shops_list_create, name='shops_list_create'),
    path('my-shop/', views.my_shop, name='my_shop'),
    path('pending/', views.pending_shops, name='pending_shops'),
    path('all/', views.all_shops, name='all_shops'),
    path('<int:shop_id>/', views.shop_detail, name='shop_detail'),
    path('<int:shop_id>/toggle-open/', views.toggle_shop_open, name='toggle_shop_open'),
    path('<int:shop_id>/approve/', views.approve_shop, name='approve_shop'),
    path('<int:shop_id>/reject/', views.reject_shop, name='reject_shop'),
    path('admin/stats/', views.get_admin_stats, name='get_admin_stats'),
]
