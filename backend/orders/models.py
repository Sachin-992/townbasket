"""
Order models with proper Foreign Key relationships.

DATA INTEGRITY:
- Customer is linked via ForeignKey to User model
- Delivery partner is linked via ForeignKey to User model
- Proper cascade/SET_NULL behaviors defined
"""
from django.db import models
from shops.models import Shop
from products.models import Product


class Order(models.Model):
    """
    Order model for customer orders.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('preparing', 'Preparing'),
        ('ready', 'Ready for Pickup/Delivery'),
        ('out_for_delivery', 'Out for Delivery'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
    ]
    
    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]
    
    PAYMENT_METHOD_CHOICES = [
        ('cod', 'Cash on Delivery'),
        ('upi', 'UPI'),
        ('online', 'Online Payment'),
    ]

    # Order ID
    order_number = models.CharField(max_length=20, unique=True)
    
    # Customer - FIXED: Now a proper ForeignKey
    customer = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='orders',
        db_index=True
    )
    # Denormalized for display (snapshot at order time)
    customer_name = models.CharField(max_length=255)
    customer_phone = models.CharField(max_length=15)
    
    # Keep supabase_uid for backwards compatibility during migration
    # TODO: Remove after data migration is complete
    customer_supabase_uid = models.CharField(max_length=255, db_index=True, blank=True, default='')
    
    # Delivery partner - FIXED: Now a proper ForeignKey
    delivery_partner = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='deliveries',
        db_index=True
    )
    # Keep for backwards compatibility
    delivery_supabase_uid = models.CharField(max_length=255, blank=True, null=True, db_index=True)
    
    # Delivery address
    delivery_address = models.TextField()
    delivery_area = models.CharField(max_length=100, blank=True, null=True)
    delivery_town = models.CharField(max_length=100)
    
    # Shop
    shop = models.ForeignKey(Shop, on_delete=models.CASCADE, related_name='orders')
    
    # Order details
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Payment
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default='cod')
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending')
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Notes
    customer_note = models.TextField(blank=True, null=True)
    seller_note = models.TextField(blank=True, null=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    confirmed_at = models.DateTimeField(blank=True, null=True)
    delivered_at = models.DateTimeField(blank=True, null=True)
    
    # Rewards
    free_delivery_used = models.BooleanField(default=False)

    class Meta:
        db_table = 'orders'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['customer', 'status']),
        ]

    def __str__(self):
        return f"Order {self.order_number} - {self.customer_name}"
    
    def save(self, *args, **kwargs):
        if not self.order_number:
            # Generate order number
            import random
            import string
            self.order_number = 'TB' + ''.join(random.choices(string.digits, k=8))
        
        # Sync supabase_uid for backwards compatibility
        if self.customer and not self.customer_supabase_uid:
            self.customer_supabase_uid = self.customer.supabase_uid
        if self.delivery_partner and not self.delivery_supabase_uid:
            self.delivery_supabase_uid = self.delivery_partner.supabase_uid
            
        super().save(*args, **kwargs)


class OrderItem(models.Model):
    """
    Individual items in an order.
    """
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True)
    
    # Store product details at time of order (in case product changes later)
    product_name = models.CharField(max_length=255)
    product_image_url = models.URLField(blank=True, null=True)
    
    # Quantity and pricing
    quantity = models.IntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        db_table = 'order_items'

    def __str__(self):
        return f"{self.quantity}x {self.product_name}"
    
    def save(self, *args, **kwargs):
        self.total_price = self.quantity * self.unit_price
        super().save(*args, **kwargs)


class Invoice(models.Model):
    """
    Invoice model for automated invoice generation.
    One invoice per order. Generated when order status → delivered.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('generated', 'Generated'),
        ('sent', 'Sent'),
        ('failed', 'Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=None, editable=False)
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='invoice')
    invoice_number = models.CharField(max_length=20, unique=True)
    pdf_path = models.CharField(max_length=500, blank=True, default='')
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    generated_at = models.DateTimeField(null=True, blank=True)
    email_sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'invoices'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['order']),
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['invoice_number']),
        ]

    def __str__(self):
        return f"Invoice {self.invoice_number} – Order {self.order.order_number}"

    def save(self, *args, **kwargs):
        import uuid as _uuid
        if self.id is None:
            self.id = _uuid.uuid4()
        super().save(*args, **kwargs)

