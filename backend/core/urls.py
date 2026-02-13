from django.urls import path
from . import views
from . import admin_views
from . import admin_sse
from . import admin_sse_async
from . import analytics
from . import fraud_views
from . import bulk
from .admin_security import issue_admin_verify_token
from . import rbac as rbac_views

urlpatterns = [
    path('settings/', views.town_settings_get, name='town_settings_get'),
    path('settings/update/', views.town_settings_update, name='town_settings_update'),
]

admin_urlpatterns = [
    # ── Overview & Existing ──────────────────────
    path('overview/', admin_views.admin_overview, name='admin_overview'),
    path('revenue-analytics/', admin_views.revenue_analytics, name='revenue_analytics'),
    path('user-growth/', admin_views.user_growth, name='user_growth'),
    path('system-health/', admin_views.system_health, name='system_health'),
    path('activity-feed/', admin_views.activity_feed, name='activity_feed'),
    path('audit-logs/', admin_views.audit_logs, name='audit_logs'),
    path('audit-logs/export/', admin_views.export_audit_csv, name='export_audit_csv'),
    path('audit-logs/admins/', admin_views.audit_admin_list, name='audit_admin_list'),
    path('search/', admin_views.admin_quick_search, name='admin_quick_search'),
    path('permissions/', rbac_views.admin_permissions, name='admin_permissions'),
    path('sse/', admin_sse.admin_sse, name='admin_sse'),
    path('sse-async/', admin_sse_async.admin_sse_async, name='admin_sse_async'),

    # ── Advanced Analytics ───────────────────────
    path('analytics/top-products/', analytics.top_products, name='top_products'),
    path('analytics/top-shops/', analytics.top_shops, name='top_shops'),
    path('analytics/peak-hours/', analytics.peak_hours, name='peak_hours'),
    path('analytics/conversion-funnel/', analytics.conversion_funnel, name='conversion_funnel'),
    path('analytics/clv/', analytics.customer_lifetime_value, name='customer_lifetime_value'),
    path('analytics/delivery-efficiency/', analytics.delivery_efficiency, name='delivery_efficiency'),

    # ── Fraud Detection ──────────────────────────
    path('fraud/alerts/', fraud_views.fraud_alerts, name='fraud_alerts'),
    path('fraud/alerts/<int:alert_id>/dismiss/', fraud_views.dismiss_alert, name='dismiss_alert'),
    path('fraud/alerts/<int:alert_id>/investigate/', fraud_views.investigate_alert, name='investigate_alert'),
    path('fraud/alerts/<int:alert_id>/confirm/', fraud_views.confirm_alert, name='confirm_alert'),
    path('fraud/high-risk-users/', fraud_views.high_risk_users, name='high_risk_users'),
    path('fraud/summary/', fraud_views.fraud_summary, name='fraud_summary'),
    path('fraud/scan/', fraud_views.fraud_scan, name='fraud_scan'),

    # ── Bulk Actions ─────────────────────────────
    path('bulk/shops/', bulk.bulk_shops, name='bulk_shops'),
    path('bulk/users/', bulk.bulk_users, name='bulk_users'),

    # ── Module Stats ─────────────────────────────
    path('shops/stats/', admin_views.admin_shops_stats, name='admin_shops_stats'),
    path('orders/stats/', admin_views.admin_orders_stats, name='admin_orders_stats'),

    # ── Security ─────────────────────────────────
    path('request-verify/', issue_admin_verify_token, name='admin_request_verify'),
]
