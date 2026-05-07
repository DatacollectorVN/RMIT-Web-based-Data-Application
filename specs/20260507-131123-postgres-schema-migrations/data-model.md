# Data Model: SPEC-02 — PostgreSQL Schema & Migrations

**Date**: 2026-05-07  
**Source**: `sample_ddls.sql`  
**Authority**: SPEC-00 database conventions

## Entities

### User (`users`)

- **Fields**
  - `id` (UUID)
  - `email` (string; unique)
  - `password_hash` (string)
  - `full_name` (string)
  - `created_at` (timestamp)
  - `updated_at` (timestamp)
- **Indexes**
  - `idx_users_email` on `email`

### Product (`products`)

- **Fields**
  - `id` (UUID)
  - `brand` (string)
  - `name` (string)
  - `description` (text)
  - `price` (decimal; non-negative)
  - `category` (string)
  - `photos` (array of text)
  - `created_at` (timestamp)
  - `updated_at` (timestamp)
- **Indexes**
  - `idx_products_brand` on `brand`
  - `idx_products_category` on `category`
  - `idx_products_updated` on `updated_at DESC`

### Review (`reviews`)

- **Fields**
  - `id` (UUID)
  - `user_id` (UUID; references `users.id`)
  - `product_id` (UUID; references `products.id`)
  - `title` (string)
  - `content` (text)
  - `rating` (small integer; 1–5)
  - `status` (string enum: `pending` | `done`)
  - `ai_label` (boolean; nullable)
  - `final_label` (boolean; nullable)
  - `created_at` (timestamp)
  - `updated_at` (timestamp)
- **Relationships**
  - Many reviews belong to one user
  - Many reviews belong to one product
- **Indexes**
  - `idx_reviews_product_id` on `product_id`
  - `idx_reviews_user_id` on `user_id`
  - `idx_reviews_product_status` on `(product_id, status)`
  - `idx_reviews_created` on `created_at DESC`

### Order (`orders`)

- **Fields**
  - `id` (UUID)
  - `user_id` (UUID; references `users.id`)
  - `total_amount` (decimal; non-negative)
  - `status` (string enum: `pending` | `completed` | `cancelled`)
  - `created_at` (timestamp)
  - `updated_at` (timestamp)
- **Relationships**
  - Many orders belong to one user
- **Indexes**
  - `idx_orders_user_id` on `user_id`
  - `idx_orders_user_created` on `(user_id, created_at DESC)`

### Order Item (`order_items`)

- **Fields**
  - `id` (UUID)
  - `order_id` (UUID; references `orders.id`)
  - `product_id` (UUID; references `products.id`)
  - `quantity` (int; > 0)
  - `unit_price` (decimal; non-negative)
  - `created_at` (timestamp)
- **Relationships**
  - Many order items belong to one order
  - Many order items reference one product
- **Indexes**
  - `idx_order_items_order_id` on `order_id`
  - `idx_order_items_product_id` on `product_id`

## Cross-cutting rules

- `updated_at` is automatically maintained for: `users`, `products`, `reviews`, `orders`.
- Foreign keys use `ON DELETE` behaviors per `sample_ddls.sql` (cascade/restrict as documented in research).
