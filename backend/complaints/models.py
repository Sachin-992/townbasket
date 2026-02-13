from django.db import models

class Complaint(models.Model):
    """
    Complaint/Issue model for user grievances.
    """
    TYPE_CHOICES = [
        ('delivery', 'Delivery Issue'),
        ('food_quality', 'Food Quality'),
        ('app_issue', 'App Issue'),
        ('other', 'Other'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('resolved', 'Resolved'),
    ]

    # User info (from Supabase)
    user_supabase_uid = models.CharField(max_length=255, db_index=True)
    user_name = models.CharField(max_length=255, blank=True, null=True)
    user_phone = models.CharField(max_length=15, blank=True, null=True)
    
    # Issue details
    issue_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='other')
    description = models.TextField()
    order_id = models.CharField(max_length=50, blank=True, null=True)  # Optional link to order
    
    # Admin resolution
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    admin_note = models.TextField(blank=True, null=True)
    resolved_at = models.DateTimeField(blank=True, null=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'complaints'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', '-created_at'], name='idx_complaint_status_date'),
            models.Index(fields=['created_at'], name='idx_complaint_created'),
        ]

    def __str__(self):
        return f"{self.get_issue_type_display()} - {self.user_name}"
