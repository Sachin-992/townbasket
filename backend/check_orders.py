import os
import django
from django.conf import settings
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'townbasket_backend.settings')
django.setup()

from orders.models import Order

print(f"Time Zone: {settings.TIME_ZONE}")
print(f"Current Local Date: {timezone.localdate()}")
print(f"timezone.now().date() (UTC date): {timezone.now().date()}")

print("\n--- Orders ---")
orders = Order.objects.all()
for order in orders:
    # Convert to local time for display
    local_dt = timezone.localtime(order.created_at)
    print(f"Order #{order.order_number}: Created {local_dt} (Date: {local_dt.date()})")

print(f"\nTotal Orders: {orders.count()}")
today_count = Order.objects.filter(created_at__date=timezone.localdate()).count()
print(f"Today's Count (using localdate): {today_count}")
