from django.db import models
from shops.models import Shop


class ProductCategory(models.Model):
    """
    Product categories within a shop.
    """
    name = models.CharField(max_length=100)
    shop = models.ForeignKey(Shop, on_delete=models.CASCADE, related_name='product_categories', null=True, blank=True)
    is_global = models.BooleanField(default=False)  # If true, available for all shops
    display_order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'product_categories'
        ordering = ['display_order', 'name']
        verbose_name_plural = 'Product Categories'

    def __str__(self):
        return self.name


class Product(models.Model):
    """
    Product model for items sold by shops.
    """
    shop = models.ForeignKey(Shop, on_delete=models.CASCADE, related_name='products')
    category = models.ForeignKey(ProductCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name='products')
    
    # Product details
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    
    # Pricing
    price = models.DecimalField(max_digits=10, decimal_places=2)
    discount_price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    
    # Unit info (e.g., "1 kg", "500 ml", "1 piece")
    unit = models.CharField(max_length=50, default='piece')
    unit_quantity = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    
    # Media
    image_url = models.URLField(blank=True, null=True)
    
    # Stock
    in_stock = models.BooleanField(default=True)
    stock_quantity = models.IntegerField(blank=True, null=True)  # Optional stock tracking
    
    # Status
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'products'
        ordering = ['-is_featured', '-created_at']

    def __str__(self):
        return f"{self.name} - {self.shop.name}"
    
    @property
    def effective_price(self):
        """Return discount price if available, otherwise regular price."""
        return self.discount_price if self.discount_price else self.price
    
    @property
    def discount_percentage(self):
        """Calculate discount percentage."""
        if self.discount_price and self.price > 0:
            return int(((self.price - self.discount_price) / self.price) * 100)
        return 0
