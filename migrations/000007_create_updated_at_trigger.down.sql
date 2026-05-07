DROP TRIGGER IF EXISTS set_updated_at_photos   ON photos;
DROP TRIGGER IF EXISTS set_updated_at_orders   ON orders;
DROP TRIGGER IF EXISTS set_updated_at_reviews  ON reviews;
DROP TRIGGER IF EXISTS set_updated_at_products ON products;
DROP TRIGGER IF EXISTS set_updated_at_users    ON users;

DROP FUNCTION IF EXISTS trigger_set_updated_at();
