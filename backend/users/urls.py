from django.urls import path
from . import views

urlpatterns = [
    path('sync/', views.sync_user, name='sync_user'),
    path('me/', views.get_current_user, name='get_current_user'),
    path('me/role/', views.update_role, name='update_role'),
    path('list/', views.list_users_by_role, name='list_users_by_role'),
    path('<int:user_id>/toggle-active/', views.toggle_user_active, name='toggle_user_active'),
    path('toggle-online/', views.toggle_online_status, name='toggle_online_status'),
    path('online-partners/', views.list_online_partners, name='list_online_partners'),
    path('enroll/', views.enroll_delivery_partner, name='enroll_delivery_partner'),
    # Address management
    path('addresses/', views.get_addresses, name='get_addresses'),
    path('addresses/add/', views.add_address, name='add_address'),
    path('addresses/update/', views.update_address, name='update_address'),
    path('addresses/delete/', views.delete_address, name='delete_address'),
    path('addresses/set-default/', views.set_default_address, name='set_default_address'),
    # Profile management
    path('profile/update/', views.update_profile, name='update_profile'),
    path('profile/stats/', views.get_profile_stats, name='get_profile_stats'),
]
