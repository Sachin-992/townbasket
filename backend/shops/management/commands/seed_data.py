from django.core.management.base import BaseCommand
from shops.models import Category, Shop
from products.models import Product
import random

class Command(BaseCommand):
    help = 'Seeds the database with dummy categories, shops, and products'

    def handle(self, *args, **options):
        self.stdout.write('Seeding database...')
        
        # Create Categories
        categories_data = [
            {'name': 'Grocery', 'icon': '🛒', 'display_order': 1},
            {'name': 'Bakery', 'icon': '🥐', 'display_order': 2},
            {'name': 'Restaurant', 'icon': '🍔', 'display_order': 3},
            {'name': 'Pharmacy', 'icon': '💊', 'display_order': 4},
            {'name': 'Vegetables', 'icon': '🥬', 'display_order': 5},
            {'name': 'Dairy', 'icon': '🥛', 'display_order': 6},
            {'name': 'Meat', 'icon': '🥩', 'display_order': 7},
            {'name': 'General', 'icon': '📦', 'display_order': 8},
        ]
        
        categories = {}
        for cat_data in categories_data:
            cat, created = Category.objects.get_or_create(
                name=cat_data['name'],
                defaults={'icon': cat_data['icon'], 'display_order': cat_data['display_order']}
            )
            categories[cat_data['name']] = cat
            if created:
                self.stdout.write(f'  Created category: {cat.name}')
        
        # Create Shops
        shops_data = [
            {
                'name': 'Fresh Mart',
                'category': 'Grocery',
                'town': 'Downtown',
                'address': '123 Main Street, Downtown',
                'phone': '9876543210',
                'description': 'Your one-stop shop for daily groceries and fresh produce',
            },
            {
                'name': 'Golden Bakery',
                'category': 'Bakery',
                'town': 'Westside',
                'address': '45 Baker Lane, Westside',
                'phone': '9876543211',
                'description': 'Fresh bread, cakes, and pastries baked daily',
            },
            {
                'name': 'Spice Kitchen',
                'category': 'Restaurant',
                'town': 'Downtown',
                'address': '78 Food Court, Downtown',
                'phone': '9876543212',
                'description': 'Authentic Indian cuisine with fast delivery',
            },
            {
                'name': 'MedPlus Pharmacy',
                'category': 'Pharmacy',
                'town': 'Central',
                'address': '10 Health Avenue, Central',
                'phone': '9876543213',
                'description': 'All medicines and health essentials',
            },
            {
                'name': 'Green Farms',
                'category': 'Vegetables',
                'town': 'Eastside',
                'address': '56 Farm Road, Eastside',
                'phone': '9876543214',
                'description': 'Organic vegetables straight from the farm',
            },
            {
                'name': 'Dairy Delight',
                'category': 'Dairy',
                'town': 'Northside',
                'address': '22 Milk Lane, Northside',
                'phone': '9876543215',
                'description': 'Fresh milk, paneer, cheese and more',
            },
        ]
        
        shops = []
        for shop_data in shops_data:
            category = categories.get(shop_data['category'])
            owner_uid = f'demo_{shop_data["name"].lower().replace(" ", "_")}'
            
            shop, created = Shop.objects.get_or_create(
                name=shop_data['name'],
                defaults={
                    'category': category,
                    'town': shop_data['town'],
                    'address': shop_data['address'],
                    'phone': shop_data['phone'],
                    'description': shop_data['description'],
                    'owner_supabase_uid': owner_uid,
                    'owner_name': f'{shop_data["name"]} Owner',
                    'owner_phone': shop_data['phone'],
                    'is_open': True,
                    'status': 'approved',
                    'opening_time': '09:00',
                    'closing_time': '21:00',
                    'average_rating': round(random.uniform(3.8, 4.9), 1),
                }
            )
            shops.append(shop)
            if created:
                self.stdout.write(f'  Created shop: {shop.name}')
        
        # Create Products for each shop
        products_by_category = {
            'Grocery': [
                {'name': 'Basmati Rice', 'price': 150, 'unit': 'kg', 'unit_quantity': 1},
                {'name': 'Toor Dal', 'price': 120, 'unit': 'kg', 'unit_quantity': 1},
                {'name': 'Sunflower Oil', 'price': 180, 'unit': 'L', 'unit_quantity': 1},
                {'name': 'Sugar', 'price': 45, 'unit': 'kg', 'unit_quantity': 1},
                {'name': 'Wheat Flour (Atta)', 'price': 55, 'unit': 'kg', 'unit_quantity': 1},
                {'name': 'Salt', 'price': 25, 'unit': 'kg', 'unit_quantity': 1},
                {'name': 'Tea Powder', 'price': 280, 'unit': 'g', 'unit_quantity': 250},
                {'name': 'Coffee Powder', 'price': 350, 'unit': 'g', 'unit_quantity': 200},
            ],
            'Bakery': [
                {'name': 'Fresh Bread Loaf', 'price': 40, 'unit': 'pc', 'unit_quantity': 1},
                {'name': 'Butter Croissant', 'price': 60, 'unit': 'pc', 'unit_quantity': 1},
                {'name': 'Chocolate Cake', 'price': 450, 'unit': 'kg', 'unit_quantity': 1},
                {'name': 'Puff Pastry', 'price': 25, 'unit': 'pc', 'unit_quantity': 1},
                {'name': 'Cookies Pack', 'price': 80, 'unit': 'pack', 'unit_quantity': 1},
                {'name': 'Pizza Base', 'price': 50, 'unit': 'pc', 'unit_quantity': 2},
            ],
            'Restaurant': [
                {'name': 'Butter Chicken', 'price': 280, 'unit': 'portion', 'unit_quantity': 1},
                {'name': 'Paneer Tikka', 'price': 220, 'unit': 'portion', 'unit_quantity': 1},
                {'name': 'Chicken Biryani', 'price': 200, 'unit': 'plate', 'unit_quantity': 1},
                {'name': 'Butter Naan', 'price': 30, 'unit': 'pc', 'unit_quantity': 1},
                {'name': 'Dal Makhani', 'price': 180, 'unit': 'portion', 'unit_quantity': 1},
                {'name': 'Gulab Jamun', 'price': 60, 'unit': 'pc', 'unit_quantity': 2},
            ],
            'Pharmacy': [
                {'name': 'Paracetamol 500mg', 'price': 30, 'unit': 'strip', 'unit_quantity': 10},
                {'name': 'Vitamin C Tablets', 'price': 150, 'unit': 'bottle', 'unit_quantity': 60},
                {'name': 'First Aid Bandages', 'price': 45, 'unit': 'pack', 'unit_quantity': 1},
                {'name': 'Hand Sanitizer', 'price': 80, 'unit': 'ml', 'unit_quantity': 200},
                {'name': 'N95 Face Masks', 'price': 100, 'unit': 'pack', 'unit_quantity': 10},
            ],
            'Vegetables': [
                {'name': 'Fresh Tomatoes', 'price': 40, 'unit': 'kg', 'unit_quantity': 1},
                {'name': 'Onions', 'price': 35, 'unit': 'kg', 'unit_quantity': 1},
                {'name': 'Potatoes', 'price': 30, 'unit': 'kg', 'unit_quantity': 1},
                {'name': 'Carrots', 'price': 50, 'unit': 'kg', 'unit_quantity': 1},
                {'name': 'Fresh Spinach', 'price': 30, 'unit': 'bunch', 'unit_quantity': 1},
                {'name': 'Green Chillies', 'price': 60, 'unit': 'g', 'unit_quantity': 250},
                {'name': 'Ginger', 'price': 80, 'unit': 'g', 'unit_quantity': 250},
            ],
            'Dairy': [
                {'name': 'Fresh Milk', 'price': 60, 'unit': 'L', 'unit_quantity': 1},
                {'name': 'Curd (Dahi)', 'price': 40, 'unit': 'g', 'unit_quantity': 400},
                {'name': 'Fresh Paneer', 'price': 90, 'unit': 'g', 'unit_quantity': 200},
                {'name': 'Amul Butter', 'price': 55, 'unit': 'g', 'unit_quantity': 100},
                {'name': 'Cheese Slices', 'price': 120, 'unit': 'pack', 'unit_quantity': 10},
                {'name': 'Pure Ghee', 'price': 550, 'unit': 'L', 'unit_quantity': 1},
            ],
        }
        
        for shop in shops:
            category_name = shop.category.name if shop.category else None
            if category_name and category_name in products_by_category:
                for prod_data in products_by_category[category_name]:
                    discount = random.choice([0, 0, 0, 5, 10, 15, 20])
                    discount_price = prod_data['price'] - (prod_data['price'] * discount // 100) if discount else None
                    
                    product, created = Product.objects.get_or_create(
                        shop=shop,
                        name=prod_data['name'],
                        defaults={
                            'price': prod_data['price'],
                            'discount_price': discount_price,
                            'unit': prod_data['unit'],
                            'unit_quantity': prod_data['unit_quantity'],
                            'in_stock': True,
                        }
                    )
                    if created:
                        self.stdout.write(f'    Created product: {product.name} for {shop.name}')
        
        self.stdout.write(self.style.SUCCESS('\n✅ Database seeded successfully!'))
        self.stdout.write(f'  📁 Categories: {Category.objects.count()}')
        self.stdout.write(f'  🏪 Shops: {Shop.objects.count()}')
        self.stdout.write(f'  📦 Products: {Product.objects.count()}')
