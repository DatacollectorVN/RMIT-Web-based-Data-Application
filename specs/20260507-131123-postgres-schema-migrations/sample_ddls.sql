-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================
-- TABLE: users
-- ============================================================
CREATE TABLE users (
    id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    email         VARCHAR(255)  NOT NULL UNIQUE,
    password_hash VARCHAR(255)  NOT NULL,
    full_name     VARCHAR(255)  NOT NULL,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users (email);


-- ============================================================
-- TABLE: products
-- ============================================================
CREATE TABLE products (
    id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand       VARCHAR(255)    NOT NULL,
    name        VARCHAR(500)    NOT NULL,
    description TEXT            NOT NULL,
    price       DECIMAL(10, 2)  NOT NULL CHECK (price >= 0),
    category    VARCHAR(100)    NOT NULL,
    photos      TEXT[]          NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_brand    ON products (brand);
CREATE INDEX idx_products_category ON products (category);
CREATE INDEX idx_products_updated  ON products (updated_at DESC);


-- ============================================================
-- TABLE: reviews
-- ============================================================
CREATE TABLE reviews (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    product_id  UUID        NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    title       VARCHAR(255) NOT NULL,
    content     TEXT         NOT NULL,
    rating      SMALLINT     NOT NULL CHECK (rating BETWEEN 1 AND 5),
    status      VARCHAR(20)  NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'done')),
    ai_label    BOOLEAN,
    final_label BOOLEAN,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reviews_product_id        ON reviews (product_id);
CREATE INDEX idx_reviews_user_id           ON reviews (user_id);
CREATE INDEX idx_reviews_product_status    ON reviews (product_id, status);
CREATE INDEX idx_reviews_created           ON reviews (created_at DESC);


-- ============================================================
-- TABLE: orders
-- ============================================================
CREATE TABLE orders (
    id           UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID            NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    total_amount DECIMAL(10, 2)  NOT NULL CHECK (total_amount >= 0),
    status       VARCHAR(50)     NOT NULL DEFAULT 'pending'
                                 CHECK (status IN ('pending', 'completed', 'cancelled')),
    created_at   TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_user_id         ON orders (user_id);
CREATE INDEX idx_orders_user_created    ON orders (user_id, created_at DESC);


-- ============================================================
-- TABLE: order_items
-- ============================================================
CREATE TABLE order_items (
    id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id    UUID            NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    product_id  UUID            NOT NULL REFERENCES products (id) ON DELETE RESTRICT,
    quantity    INTEGER         NOT NULL CHECK (quantity > 0),
    unit_price  DECIMAL(10, 2)  NOT NULL CHECK (unit_price >= 0),
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_items_order_id   ON order_items (order_id);
CREATE INDEX idx_order_items_product_id ON order_items (product_id);


-- ============================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_users
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_products
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_reviews
    BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_orders
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at()