from django.urls import path
from . import views
from . import admin_views
from . import admin_sse

urlpatterns = [
    path('settings/', views.town_settings_get, name='town_settings_get'),
    path('settings/update/', views.town_settings_update, name='town_settings_update'),
]

admin_urlpatterns = [
    path('overview/', admin_views.admin_overview, name='admin_overview'),
    path('revenue-analytics/', admin_views.revenue_analytics, name='revenue_analytics'),
    path('user-growth/', admin_views.user_growth, name='user_growth'),
    path('system-health/', admin_views.system_health, name='system_health'),
    path('activity-feed/', admin_views.activity_feed, name='activity_feed'),
    path('audit-logs/', admin_views.audit_logs, name='audit_logs'),
    path('sse/', admin_sse.admin_sse, name='admin_sse'),
]

