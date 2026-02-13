from django.db import models
from .audit import AuditLog  # noqa: F401 — exposed for Django model discovery
from .fraud import FraudAlert  # noqa: F401 — exposed for Django model discovery
from .metrics import AdminMetricsDaily  # noqa: F401 — exposed for Django model discovery

class TownSettings(models.Model):
    """
    Singleton model for Town-level configurations.
    """
    # General
    town_name = models.CharField(max_length=100, default='TownBasket')
    
    # Feature Toggles
    is_open_for_delivery = models.BooleanField(default=True)
    night_orders_enabled = models.BooleanField(default=False)
    cod_enabled = models.BooleanField(default=True)
    
    # Operational
    default_delivery_charge = models.DecimalField(max_digits=5, decimal_places=2, default=20.00)
    
    # Timestamps
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'town_settings'
        verbose_name_plural = 'Town Settings'

    def __str__(self):
        return "Global Town Settings"

    def save(self, *args, **kwargs):
        # Ensure only one instance exists (singleton pattern)
        if not self.pk and TownSettings.objects.exists():
            self.pk = TownSettings.objects.first().pk
        super(TownSettings, self).save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, created = cls.objects.get_or_create(pk=1)
        return obj
