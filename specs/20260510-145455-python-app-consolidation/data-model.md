# Data Model: SPEC-04 — Python App Consolidation

This spec introduces no new database tables. It establishes the Python object model
that maps to the existing PostgreSQL schema.

---

## SQLAlchemy ORM Models (`app/models/`)

### `Product` (`products` table)

| Python attribute | SQL column | Type | Notes |
|---|---|---|---|
| `id` | `id` | `UUID` (PK) | Generated in Python with `uuid4()` |
| `brand` | `brand` | `String(255)` | |
| `name` | `name` | `String(500)` | |
| `description` | `description` | `Text` | |
| `price` | `price` | `Numeric(10,2)` | CHECK price >= 0 |
| `category` | `category` | `String(100)` | |
| `created_at` | `created_at` | `DateTime(timezone=True)` | |
| `updated_at` | `updated_at` | `DateTime(timezone=True)` | auto-updated by trigger |

### `Photo` (`photos` table)

| Python attribute | SQL column | Type | Notes |
|---|---|---|---|
| `id` | `id` | `UUID` (PK) | |
| `product_id` | `product_id` | `UUID` (FK → products.id) | ON DELETE CASCADE |
| `url` | `url` | `Text` | |
| `is_primary` | `is_primary` | `Boolean` | unique per product when active |
| `sort_order` | `sort_order` | `Integer` | |
| `is_active` | `is_active` | `Boolean` | |
| `created_at` | `created_at` | `DateTime(timezone=True)` | |
| `updated_at` | `updated_at` | `DateTime(timezone=True)` | |

### `User` (`users` table)

| Python attribute | SQL column | Type | Notes |
|---|---|---|---|
| `id` | `id` | `UUID` (PK) | |
| `email` | `email` | `String(255)` | UNIQUE |
| `password_hash` | `password_hash` | `String(255)` | bcrypt |
| `full_name` | `full_name` | `String(255)` | |
| `role` | `role` | `String(20)` | `buyer` / `seller` / `admin` |
| `created_at` | `created_at` | `DateTime(timezone=True)` | |
| `updated_at` | `updated_at` | `DateTime(timezone=True)` | |

### `Review` (`reviews` table)

| Python attribute | SQL column | Type | Notes |
|---|---|---|---|
| `id` | `id` | `UUID` (PK) | |
| `user_id` | `user_id` | `UUID` (FK → users.id) | ON DELETE RESTRICT |
| `product_id` | `product_id` | `UUID` (FK → products.id) | ON DELETE RESTRICT |
| `title` | `title` | `String(255)` | |
| `content` | `content` | `Text` | |
| `rating` | `rating` | `Integer` | 1–5 |
| `status` | `status` | `String(20)` | `pending` / `done` |
| `ai_label` | `ai_label` | `Boolean` (nullable) | from AI classifier |
| `final_label` | `final_label` | `Boolean` (nullable) | overridable |
| `created_at` | `created_at` | `DateTime(timezone=True)` | |
| `updated_at` | `updated_at` | `DateTime(timezone=True)` | |

### `Order` (`orders` table)

| Python attribute | SQL column | Type | Notes |
|---|---|---|---|
| `id` | `id` | `UUID` (PK) | |
| `user_id` | `user_id` | `UUID` (FK → users.id) | |
| `total_amount` | `total_amount` | `Numeric(10,2)` | |
| `status` | `status` | `String(20)` | `pending` / `completed` / `cancelled` |
| `created_at` | `created_at` | `DateTime(timezone=True)` | |
| `updated_at` | `updated_at` | `DateTime(timezone=True)` | |

### `OrderItem` (`order_items` table)

| Python attribute | SQL column | Type | Notes |
|---|---|---|---|
| `id` | `id` | `UUID` (PK) | |
| `order_id` | `order_id` | `UUID` (FK → orders.id) | ON DELETE CASCADE |
| `product_id` | `product_id` | `UUID` (FK → products.id) | ON DELETE RESTRICT |
| `quantity` | `quantity` | `Integer` | |
| `unit_price` | `unit_price` | `Numeric(10,2)` | snapshot price at order time |
| `created_at` | `created_at` | `DateTime(timezone=True)` | |

---

## OpenSearch Document (`products` index)

| Field | Python type | Notes |
|---|---|---|
| `product_id` | `str` | UUID as string |
| `brand` | `str` | lexical field |
| `name` | `str` | primary lexical field |
| `description` | `str` | long text |
| `category` | `str` | keyword filter |
| `price` | `float` | sortable |
| `item_vector` | `list[float]` | 384-dim unit vector |
| `updated_at` | `datetime` | ISO 8601 |

---

## Script Entities

### `ReindexSummary`
Produced by `app/scripts/reindex_products.py` on completion.

| Field | Type | Example |
|---|---|---|
| `target_index` | str | `"products"` |
| `indexed` | int | `8` |
| `failed` | int | `0` |
| `skipped` | int | `0` |
