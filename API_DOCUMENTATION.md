# TownBasket API Endpoints

## Base URL: `http://localhost:8000/api`

---

## 🔐 Users API (`/api/users/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/users/sync/` | Sync user from Supabase |

---

## 🏪 Shops API (`/api/shops/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/shops/` | List all approved shops |
| POST | `/shops/` | Create a new shop |
| GET | `/shops/categories/` | List all categories |
| GET | `/shops/my-shop/?supabase_uid={uid}` | Get seller's shop |
| GET | `/shops/{id}/` | Get shop details |
| PATCH | `/shops/{id}/` | Update shop |
| PATCH | `/shops/{id}/toggle-open/` | Toggle open/closed |
| GET | `/shops/pending/` | Get pending shops (Admin) |
| GET | `/shops/all/` | Get all shops (Admin) |
| PATCH | `/shops/{id}/approve/` | Approve shop (Admin) |
| PATCH | `/shops/{id}/reject/` | Reject shop (Admin) |

---

## 📦 Products API (`/api/products/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/products/?shop_id={id}` | List products by shop |
| POST | `/products/` | Create product |
| GET | `/products/{id}/` | Get product details |
| PATCH | `/products/{id}/` | Update product |
| DELETE | `/products/{id}/` | Delete product |
| PATCH | `/products/{id}/toggle-stock/` | Toggle in/out of stock |

---

## 📋 Orders API (`/api/orders/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/orders/seller/?supabase_uid={uid}` | Get seller orders |
| GET | `/orders/customer/?supabase_uid={uid}` | Get customer orders |
| GET | `/orders/delivery/?status={status}` | Get delivery orders |
| GET | `/orders/all/` | Get all orders (Admin) |
| POST | `/orders/create/` | Create new order |
| GET | `/orders/{id}/` | Get order details |
| PATCH | `/orders/{id}/status/` | Update order status |

---

## 🖥️ Browsable API

Access the Django REST Framework browsable API at:
- **Shops:** http://localhost:8000/api/shops/
- **Products:** http://localhost:8000/api/products/
- **Orders:** http://localhost:8000/api/orders/
- **Admin Panel:** http://localhost:8000/admin/

---

## 📝 Quick Test Examples

```bash
# Get all shops
curl http://localhost:8000/api/shops/

# Get categories
curl http://localhost:8000/api/shops/categories/

# Get products for a shop
curl http://localhost:8000/api/products/?shop_id=1

# Create an order (POST)
curl -X POST http://localhost:8000/api/orders/create/ \
  -H "Content-Type: application/json" \
  -d '{"customer_supabase_uid": "xxx", "shop_id": 1, ...}'
```
