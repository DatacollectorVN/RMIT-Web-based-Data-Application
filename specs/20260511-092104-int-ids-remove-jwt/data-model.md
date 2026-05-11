# Data Model: Integer PKs & aligned search IDs

All core entities use **64-bit integer** primary keys assigned by the database. Foreign keys use the same integer type. Timestamps and naming conventions (snake_case, plural tables) unchanged from prior schema.

---

## Tables

### `users`

| Column | Type | Notes |
|--------|------|--------|
| `id` | BIGINT PK, identity | Auto-generated |
| `email` | VARCHAR(255) UNIQUE | |
| `password_hash` | VARCHAR(255) | bcrypt; may remain for future auth |
| `full_name` | VARCHAR(255) | |
| `role` | VARCHAR(20) | buyer / seller / admin |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### `products`

| Column | Type | Notes |
|--------|------|--------|
| `id` | BIGINT PK, identity | Auto-generated |
| `brand` | VARCHAR(255) | |
| `name` | VARCHAR(500) | |
| `description` | TEXT | |
| `price` | DECIMAL(10,2) | CHECK >= 0 |
| `category` | VARCHAR(100) | |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### `photos`

| Column | Type | Notes |
|--------|------|--------|
| `id` | BIGINT PK, identity | |
| `product_id` | BIGINT FK → products.id | ON DELETE CASCADE |
| `url` | TEXT | |
| `is_primary` | BOOLEAN | |
| `sort_order` | INTEGER | |
| `is_active` | BOOLEAN | |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### `reviews`

| Column | Type | Notes |
|--------|------|--------|
| `id` | BIGINT PK, identity | |
| `user_id` | BIGINT FK → users.id | ON DELETE CASCADE |
| `product_id` | BIGINT FK → products.id | ON DELETE CASCADE |
| `title` | VARCHAR(255) | |
| `content` | TEXT | |
| `rating` | SMALLINT | 1–5 |
| `status` | VARCHAR(20) | pending / done |
| `ai_label` | BOOLEAN NULL | |
| `final_label` | BOOLEAN NULL | |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### `orders`

| Column | Type | Notes |
|--------|------|--------|
| `id` | BIGINT PK, identity | |
| `user_id` | BIGINT FK → users.id | ON DELETE CASCADE |
| `total_amount` | DECIMAL(10,2) | |
| `status` | VARCHAR(50) | pending / completed / cancelled |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### `order_items`

| Column | Type | Notes |
|--------|------|--------|
| `id` | BIGINT PK, identity | |
| `order_id` | BIGINT FK → orders.id | ON DELETE CASCADE |
| `product_id` | BIGINT FK → products.id | ON DELETE RESTRICT |
| `quantity` | INTEGER | |
| `unit_price` | DECIMAL(10,2) | |
| `created_at` | TIMESTAMPTZ | |

---

## OpenSearch document (`products` index)

| Field | Type | Notes |
|-------|------|--------|
| `product_id` | **long** | Same value as `products.id` |
| `brand`, `name`, `description`, `category` | text / keyword | unchanged analyser |
| `price` | float | |
| `item_vector` | knn_vector (384) | unchanged |
| `updated_at` | date | |

Bulk `_id`: may be string form of integer (e.g. `"42"`) for OpenSearch compatibility.

---

## API identifiers (JSON)

All resource identifiers in request/response bodies use JSON **number** (integer) for `id`, `user_id`, `product_id`, etc. No UUID strings.
