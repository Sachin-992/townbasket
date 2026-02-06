from django.urls import path
from . import views

urlpatterns = [
    path('', views.products_list_create, name='products_list_create'),
    path('categories/', views.product_categories, name='product_categories'),
    path('<int:product_id>/', views.product_detail, name='product_detail'),
    path('<int:product_id>/toggle-stock/', views.toggle_product_stock, name='toggle_product_stock'),
]
