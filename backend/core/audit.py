"""
AuditLog model for tracking admin actions.
Enhanced for the Operational Intelligence Control Center.
"""
from django.db import models


class AuditLog(models.Model):
    """
    Records every admin action for accountability and compliance.
    Enhanced with risk levels, session tracking, and device info.
    """
    ACTION_CHOICES = [
        # Existing
        ('shop_approve', 'Shop Approved'),
        ('shop_reject', 'Shop Rejected'),
        ('shop_toggle', 'Shop Status Toggled'),
        ('user_toggle', 'User Status Toggled'),
        ('settings_update', 'Settings Updated'),
        ('complaint_resolve', 'Complaint Resolved'),
        ('order_override', 'Order Status Override'),
        # New — Fraud & Intelligence
        ('fraud_alert_dismiss', 'Fraud Alert Dismissed'),
        ('fraud_alert_investigate', 'Fraud Alert Investigated'),
        ('fraud_user_ban', 'User Banned for Fraud'),
        # New — Bulk Actions
        ('bulk_shop_approve', 'Bulk Shop Approve'),
        ('bulk_shop_reject', 'Bulk Shop Reject'),
        ('bulk_user_toggle', 'Bulk User Toggle'),
        # New — Data Export
        ('audit_export', 'Audit Log Exported'),
        ('orders_export', 'Orders Exported'),
        # New — Order Actions
        ('refund_approve', 'Refund Approved'),
        ('invoice_resend', 'Invoice Resent'),
        # New — System
        ('admin_login', 'Admin Login'),
        ('permission_change', 'Permission Changed'),
    ]

    RISK_LEVELS = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]

    admin_uid = models.CharField(max_length=255, db_index=True)
    admin_name = models.CharField(max_length=255, blank=True, default='')
    action = models.CharField(max_length=50, db_index=True)
    target_type = models.CharField(max_length=50)
    target_id = models.CharField(max_length=50, blank=True, default='')
    details = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    # New fields for Intelligence Center
    risk_level = models.CharField(
        max_length=10, choices=RISK_LEVELS, default='low', db_index=True
    )
    session_id = models.CharField(
        max_length=64, blank=True, default='',
        help_text='Groups related admin actions within a session'
    )
    user_agent = models.TextField(blank=True, default='')

    class Meta:
        db_table = 'audit_logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['action', 'created_at']),
            models.Index(fields=['admin_uid', 'created_at']),
            models.Index(fields=['risk_level', 'created_at']),
            models.Index(fields=['session_id']),
        ]

    def __str__(self):
        return f"{self.admin_name} — {self.action} — {self.target_type}:{self.target_id}"
