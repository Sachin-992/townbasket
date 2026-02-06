from django.db import models

class User(models.Model):
    """
    Custom User model for TownBasket.
    Stores user data synced from Supabase Auth.
    """
    ROLE_CHOICES = [
        ('customer', 'Customer'),
        ('seller', 'Seller'),
        ('delivery', 'Delivery Partner'),
        ('admin', 'Admin'),
    ]

    supabase_uid = models.CharField(max_length=255, unique=True, db_index=True)
    phone = models.CharField(max_length=15, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    name = models.CharField(max_length=255, blank=True, null=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='customer')
    town = models.CharField(max_length=100, blank=True, null=True)
    is_verified = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    is_online = models.BooleanField(default=False) # For delivery partners
    is_enrolled = models.BooleanField(default=False) # For delivery partners who filled the form
    rider_data = models.JSONField(blank=True, null=True) # vehicle_type, vehicle_number, etc.
    saved_addresses = models.JSONField(blank=True, null=True, default=list) # Customer delivery addresses
    wallet_balance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00) # For cash handling
    reward_points = models.IntegerField(default=0) # Reward points earned from orders
    total_orders_value = models.DecimalField(max_digits=12, decimal_places=2, default=0.00) # Lifetime spending
    free_deliveries_available = models.IntegerField(default=0) # Free deliveries earned (1 per ₹500 spent)
    free_deliveries_used = models.IntegerField(default=0) # Free deliveries used
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'users'

    def __str__(self):
        return f"{self.phone or self.email} ({self.role})"
