"""
AuditLog model for tracking admin actions.
"""
from django.db import models


class AuditLog(models.Model):
    """
    Records every admin action for accountability and compliance.
    """
    ACTION_CHOICES = [
        ('shop_approve', 'Shop Approved'),
        ('shop_reject', 'Shop Rejected'),
        ('shop_toggle', 'Shop Status Toggled'),
        ('user_toggle', 'User Status Toggled'),
        ('settings_update', 'Settings Updated'),
        ('complaint_resolve', 'Complaint Resolved'),
        ('order_override', 'Order Status Override'),
    ]

    admin_uid = models.CharField(max_length=255, db_index=True)
    admin_name = models.CharField(max_length=255, blank=True, default='')
    action = models.CharField(max_length=50, db_index=True)
    target_type = models.CharField(max_length=50)  # 'shop', 'user', 'order', 'complaint', 'settings'
    target_id = models.CharField(max_length=50, blank=True, default='')
    details = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'audit_logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['action', 'created_at']),
            models.Index(fields=['admin_uid', 'created_at']),
        ]

    def __str__(self):
        return f"{self.admin_name} — {self.action} — {self.target_type}:{self.target_id}"
