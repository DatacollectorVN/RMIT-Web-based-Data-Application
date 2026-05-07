CREATE TABLE order_items (
    id          UUID            PRIMARY KEY,
    order_id    UUID            NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    product_id  UUID            NOT NULL REFERENCES products (id) ON DELETE RESTRICT,
    quantity    INTEGER         NOT NULL CHECK (quantity > 0),
    unit_price  DECIMAL(10, 2)  NOT NULL CHECK (unit_price >= 0),
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_items_order_id   ON order_items (order_id);
CREATE INDEX idx_order_items_product_id ON order_items (product_id);
