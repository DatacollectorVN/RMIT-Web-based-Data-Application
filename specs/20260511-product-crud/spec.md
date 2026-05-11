# Feature Specification: Full E-Commerce CRUD API

**Feature Branch**: `20260511-product-crud`  
**Created**: 2026-05-11  
**Status**: Draft  
**Input**: Implement CRUD endpoints for all e-commerce entities (users, products + photos, reviews, orders + order items). Product writes must be kept in sync with the OpenSearch `products` index. All other entities are PostgreSQL-only.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Developer can manage products and find them via search (Priority: P1)

A developer or assessor can create, read, update, and delete beauty products via the REST API. After any write, the product is immediately discoverable in the OpenSearch `products` index.

**Why this priority**: Products are the core catalogue entity; every other entity (reviews, orders) references products. OpenSearch sync is the only integration that goes beyond plain DB writes.

**Independent Test**: Start the app, `POST /api/v1/products` with a valid body, confirm `201` and an integer `id` in the response. Then `GET /api/v1/products/{id}` and confirm same data. Inspect the OpenSearch index and confirm a document with matching `product_id` (long) exists. `DELETE /api/v1/products/{id}` and confirm the document is gone from the index.

**Acceptance Scenarios**:

1. **Given** the products table is empty, **When** a `POST /api/v1/products` is made with `brand`, `name`, `description`, `price`, `category`, **Then** a `201` response is returned containing a `data` object with an auto-generated integer `id` and all supplied fields.
2. **Given** a product exists in PostgreSQL, **When** `PATCH /api/v1/products/{id}` is called with updated fields, **Then** the updated values are returned and an OpenSearch document with the same `product_id` is upserted within the same request lifecycle.
3. **Given** a product exists and has associated order items, **When** `DELETE /api/v1/products/{id}` is attempted, **Then** the API returns `500` (FK RESTRICT violation) and the product remains in both PostgreSQL and OpenSearch.
4. **Given** a product with no active orders, **When** `DELETE /api/v1/products/{id}` is called, **Then** the product is removed from PostgreSQL (cascading photos and reviews) and the corresponding OpenSearch document is deleted.
5. **Given** a non-existent product id, **When** `GET /api/v1/products/{id}` is called, **Then** a `404` response with `{ "error": "Product not found" }` is returned.

---

### User Story 2 — Developer can manage orders with computed totals (Priority: P2)

A developer can create an order for a user, specifying line items (product reference, quantity, unit price). The server computes `total_amount`; the client never supplies it. Items can be added, updated, or removed post-creation, and the total is recalculated automatically.

**Why this priority**: Orders encode the purchase flow and are required to demonstrate a working e-commerce backend.

**Independent Test**: `POST /api/v1/orders` with `user_id` and `items: [{product_id, quantity, unit_price}]`. Verify `total_amount == sum(quantity * unit_price)` in the response. Add another item via `POST /api/v1/orders/{id}/items`; verify total updates. `DELETE /api/v1/orders/{id}/items/{item_id}` and verify the remaining total is correct.

**Acceptance Scenarios**:

1. **Given** a user and a product exist, **When** `POST /api/v1/orders` is called with two items, **Then** the response contains `total_amount` equal to the sum of `quantity × unit_price` for all items.
2. **Given** an existing order, **When** `POST /api/v1/orders/{id}/items` adds a new item, **Then** `total_amount` increases by `new_quantity × new_unit_price` and the full updated order is returned.
3. **Given** an existing order item, **When** `PATCH /api/v1/orders/{order_id}/items/{item_id}` changes the quantity, **Then** the order's `total_amount` is recalculated reflecting the new quantity.
4. **Given** an existing order, **When** `PATCH /api/v1/orders/{id}` is called with `status: "confirmed"`, **Then** only the status field is updated and `total_amount` is unchanged.

---

### User Story 3 — Developer can manage users without exposing password hashes (Priority: P3)

A developer can create and update user accounts. Passwords are accepted in plaintext on input and stored as bcrypt hashes. The `password_hash` column is never included in any API response.

**Why this priority**: User accounts are a prerequisite for orders and reviews; password safety is non-negotiable even without JWT in Phase 1.

**Independent Test**: `POST /api/v1/users` with `email`, `password`, `full_name`, `role`. Confirm the response has `id`, `email`, `full_name`, `role`, `created_at`, `updated_at` but NO `password_hash` or `password` field. `GET /api/v1/users/{id}` and confirm the same. Attempt to `POST` with a duplicate email; confirm `400`.

**Acceptance Scenarios**:

1. **Given** a new email address, **When** `POST /api/v1/users` is called with valid fields, **Then** a `201` is returned and the response object does not contain `password` or `password_hash`.
2. **Given** an email already registered, **When** `POST /api/v1/users` is called with the same email, **Then** a `400` response is returned.
3. **Given** a user exists, **When** `PATCH /api/v1/users/{id}` is called with a new `password`, **Then** the stored hash is updated (bcrypt) and the response still contains no password field.
4. **Given** a user has orders and reviews, **When** `DELETE /api/v1/users/{id}` is called, **Then** the user and all dependent rows cascade-delete and a `200` is returned.

---

### User Story 4 — Developer can manage product reviews with filtering (Priority: P4)

A developer can create, read, update, and delete reviews. Reviews can be filtered by `product_id` or `user_id` on the list endpoint so that all reviews for a product or by a user can be retrieved.

**Why this priority**: Reviews are secondary catalogue data — useful but not blocking other flows.

**Independent Test**: Create a review via `POST /api/v1/reviews` with `user_id`, `product_id`, `title`, `content`, `rating`. Confirm `status` defaults to `"pending"`. `GET /api/v1/reviews?product_id={id}` and confirm the review appears. Update rating via `PATCH` and confirm `rating` is constrained to 1–5.

**Acceptance Scenarios**:

1. **Given** a user and product exist, **When** `POST /api/v1/reviews` is called with valid fields, **Then** a `201` is returned with `status: "pending"`.
2. **Given** multiple reviews across different products, **When** `GET /api/v1/reviews?product_id=5` is called, **Then** only reviews for product 5 are returned.
3. **Given** an existing review, **When** `PATCH /api/v1/reviews/{id}` is called with `rating: 6`, **Then** a `422` validation error is returned.
4. **Given** an existing review, **When** `PATCH /api/v1/reviews/{id}` is called with `status: "approved"`, **Then** the status is updated.

---

### User Story 5 — Developer can manage product photos as a sub-resource (Priority: P5)

A developer can add, update, and delete photos for a product. Photos carry `url`, `is_primary`, `sort_order`, and `is_active` flags. Attempting to manage photos for a non-existent product returns a `404`.

**Why this priority**: Photos are supporting catalogue data and are the most independent sub-resource.

**Independent Test**: `POST /api/v1/products/{id}/photos` with `url`, confirm `201` and `product_id` in response. `PATCH` the `is_primary` flag. `DELETE` the photo and confirm it is gone.

**Acceptance Scenarios**:

1. **Given** a product exists, **When** `POST /api/v1/products/{id}/photos` is called, **Then** a `201` with the photo record (including `product_id`) is returned.
2. **Given** a non-existent product id, **When** `POST /api/v1/products/{id}/photos` is called, **Then** a `404` is returned.
3. **Given** a photo exists, **When** `DELETE /api/v1/products/{product_id}/photos/{photo_id}` is called, **Then** only that photo is deleted; the parent product is unaffected.

---

### Edge Cases

- **Product delete with active orders**: `order_items.product_id` is `ON DELETE RESTRICT`; deleting a product with associated order items raises a DB constraint error surfaced as `500`.
- **Empty order**: `POST /api/v1/orders` with `items: []` returns `422` validation error (enforced by `OrderCreate` validator).
- **Rating boundary**: `rating` outside 1–5 returns `422`.
- **Duplicate email**: Second `POST /api/v1/users` with same email returns `400`.
- **Photo/order-item ownership check**: `PATCH /products/1/photos/99` where photo 99 belongs to product 2 returns `404`.
- **OpenSearch unavailable**: If OpenSearch is down during a product write, the DB commit is preserved and a warning is logged; the API returns `201`/`200` as normal.
- **Pagination boundaries**: `page=0` or `limit=0` returns `422`; `limit > 100` returns `422`.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The API MUST expose CRUD endpoints for `users`, `products`, `photos` (sub-resource of products), `reviews`, `orders`, and `order_items` (sub-resource of orders) under `/api/v1`.
- **FR-002**: All list endpoints MUST support `?page` and `?limit` query parameters (defaults: `page=1`, `limit=20`; max `limit=100`) and return `{ total, page, limit, items }` inside the `data` envelope.
- **FR-003**: All responses MUST use the envelope `{ "data": ... }` for success and `{ "error": "..." }` for errors, consistent with existing `/api/v1/health`.
- **FR-004**: `POST` endpoints MUST return HTTP `201`; all other successful operations MUST return HTTP `200`.
- **FR-005**: Primary keys MUST be auto-generated `BIGINT` integers; no `id` field is accepted in any Create body.
- **FR-006**: `User.password_hash` MUST NOT appear in any API response; plaintext `password` in `UserCreate` / `UserUpdate` MUST be hashed with bcrypt before storage.
- **FR-007**: `Order.total_amount` MUST be computed server-side as `sum(quantity × unit_price)` across all order items; it MUST be recalculated whenever items are added, updated, or removed.
- **FR-008**: On `POST /api/v1/products` and `PATCH /api/v1/products/{id}`, the service MUST attempt to upsert the corresponding document in the OpenSearch `products` index after a successful DB commit.
- **FR-009**: On `DELETE /api/v1/products/{id}` (successful DB delete), the service MUST attempt to delete the corresponding OpenSearch document. A `404` from OpenSearch MUST be silently ignored.
- **FR-010**: OpenSearch sync failures MUST be logged at `WARNING` level and MUST NOT affect the HTTP response status code or body.
- **FR-011**: `GET /api/v1/reviews` MUST accept optional `?product_id` and `?user_id` query parameters to filter results.
- **FR-012**: `GET /api/v1/orders` MUST accept an optional `?user_id` query parameter to filter orders by owner.

### Key Entities

- **User**: Account holder; `email` unique; `role` one of `buyer | seller | admin`.
- **Product**: Beauty product catalogue item; has many `Photo` children (cascade delete); referenced by reviews and order items.
- **Photo**: Image attachment of a product; `product_id` FK with `ON DELETE CASCADE`.
- **Review**: User opinion on a product; `rating` 1–5; `status` defaults to `pending`.
- **Order**: Purchase by a user; `total_amount` is server-computed; has many `OrderItem` children (cascade delete).
- **OrderItem**: Line item within an order; references a product with `ON DELETE RESTRICT`.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 21 HTTP routes (5 products + 4 photos + 5 users + 5 reviews + 5 orders + 3 order-item sub-routes minus duplicates = confirmed by `GET /openapi.json`) are reachable and return documented status codes without authentication headers.
- **SC-002**: `POST /api/v1/products` followed immediately by an OpenSearch `GET /{index}/_doc/{id}` returns the same `product_id` (long integer) as the API response.
- **SC-003**: An order created with two items and then modified (one item quantity changed) always returns a `total_amount` that matches `sum(quantity × unit_price)` — verified by at least three sequential API calls.
- **SC-004**: A `POST /api/v1/users` response for any created user contains no key named `password`, `password_hash`, or equivalent credential field.
- **SC-005**: Running `GET /api/v1/reviews?product_id={id}` returns only reviews whose `product_id` matches the query param, verified with at least two different product ids in the dataset.

---

## Assumptions

- Phase 1 is a public API — no `Authorization` header is required on any endpoint.
- Developers run the stack locally via `make dev`; PostgreSQL and OpenSearch are both expected to be available; the app starts even if OpenSearch is unreachable.
- `item_vector` in OpenSearch uses a deterministic placeholder 384-dim unit vector derived from product fields until real sentence-transformer embeddings are wired (Phase 2+).
- Hard deletes only — no soft delete or `deleted_at` column is introduced in Phase 1.
- `order_items.unit_price` is captured at order creation time (snapshot); it does not track live changes to `products.price`.
- `PATCH` on orders is intentionally limited to `status` only — full order mutation (items) is handled via dedicated item sub-routes.
- OpenSearch document `_id` is set to `str(product.id)` to ensure idempotent upserts.
