from django.db import models


class Category(models.Model):
    """
    Shop categories like Grocery, Bakery, Restaurant, etc.
    """
    name = models.CharField(max_length=100)
    icon = models.CharField(max_length=50, blank=True, null=True)  # Emoji or icon name
    display_order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'categories'
        ordering = ['display_order', 'name']
        verbose_name_plural = 'Categories'

    def __str__(self):
        return self.name


class Shop(models.Model):
    """
    Shop/Store model for sellers.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending Approval'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('suspended', 'Suspended'),
    ]

    # Owner info (links to Supabase user)
    owner_supabase_uid = models.CharField(max_length=255, db_index=True)
    owner_name = models.CharField(max_length=255)
    owner_phone = models.CharField(max_length=15)
    owner_email = models.EmailField(blank=True, null=True)

    # Shop details
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, related_name='shops')
    
    # Location
    address = models.TextField()
    town = models.CharField(max_length=100)
    area = models.CharField(max_length=100, blank=True, null=True)
    pincode = models.CharField(max_length=10, blank=True, null=True)
    
    # Contact
    phone = models.CharField(max_length=15)
    whatsapp = models.CharField(max_length=15, blank=True, null=True)
    
    # Media
    logo_url = models.URLField(blank=True, null=True)
    banner_url = models.URLField(blank=True, null=True)
    
    # Business hours
    opening_time = models.TimeField(blank=True, null=True)
    closing_time = models.TimeField(blank=True, null=True)
    is_open_sunday = models.BooleanField(default=True)
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    is_active = models.BooleanField(default=True)
    is_open = models.BooleanField(default=True)  # Quick toggle for seller
    
    # Ratings
    average_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.0)
    total_reviews = models.IntegerField(default=0)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'shops'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'is_active']),
            models.Index(fields=['town', 'status']),
            models.Index(fields=['owner_supabase_uid']),
        ]

    def __str__(self):
        return f"{self.name} ({self.town})"
