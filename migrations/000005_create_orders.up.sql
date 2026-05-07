CREATE TABLE orders (
    id           UUID            PRIMARY KEY,
    user_id      UUID            NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    total_amount DECIMAL(10, 2)  NOT NULL CHECK (total_amount >= 0),
    status       VARCHAR(50)     NOT NULL DEFAULT 'pending'
                                 CHECK (status IN ('pending', 'completed', 'cancelled')),
    created_at   TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_user_id         ON orders (user_id);
CREATE INDEX idx_orders_user_created    ON orders (user_id, created_at DESC);
