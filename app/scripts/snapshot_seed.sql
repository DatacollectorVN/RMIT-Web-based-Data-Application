-- Snapshot seed data for local development/demo.
-- Assumes all migrations have been applied.
-- NOTE:
--   - Intentionally does NOT insert into photos table (no image assets available yet).
--   - photos schema now includes metadata fields (is_primary, sort_order, is_active, created_at, updated_at).
--     This script remains valid by seeding only products/reviews/orders related data.

BEGIN;

TRUNCATE TABLE
  order_items,
  orders,
  reviews,
  photos,
  products,
  users
RESTART IDENTITY CASCADE;

INSERT INTO users (id, email, password_hash, full_name, role, created_at, updated_at) VALUES
  ('a3f6e2b1-8d7c-4a2b-9f0d-5c1a7e6b9d10', 'alice@example.com', '$2a$10$7QJjzq3Y2G4d6R2iK5D6UOm2Gx1nA1m5aG7J3x4m0Y8pK9xT1Jp1W', 'Alice Nguyen', 'buyer',  NOW() - INTERVAL '20 days', NOW() - INTERVAL '1 day'),
  ('b9c4d7a2-3e1f-45ad-8c21-6f7a2d1b4e33', 'bob@example.com',   '$2a$10$7QJjzq3Y2G4d6R2iK5D6UOm2Gx1nA1m5aG7J3x4m0Y8pK9xT1Jp1W', 'Bob Tran',     'seller', NOW() - INTERVAL '18 days', NOW() - INTERVAL '1 day'),
  ('c1a8f5d4-2b6e-4f7a-91cd-8e2b6d3f7a44', 'carol@example.com', '$2a$10$7QJjzq3Y2G4d6R2iK5D6UOm2Gx1nA1m5aG7J3x4m0Y8pK9xT1Jp1W', 'Carol Pham',   'buyer',  NOW() - INTERVAL '15 days', NOW() - INTERVAL '2 days'),
  ('d4e2a9b7-5c3f-4d1a-8b9e-1f6c3a7d8b55', 'david@example.com', '$2a$10$7QJjzq3Y2G4d6R2iK5D6UOm2Gx1nA1m5aG7J3x4m0Y8pK9xT1Jp1W', 'David Le',     'admin',  NOW() - INTERVAL '10 days', NOW() - INTERVAL '3 days'),
  ('e7b1c3d5-9a4f-4b2d-8e1c-3a9f6d2b1c66', 'emma@example.com',  '$2a$10$7QJjzq3Y2G4d6R2iK5D6UOm2Gx1nA1m5aG7J3x4m0Y8pK9xT1Jp1W', 'Emma Hoang',   'seller', NOW() - INTERVAL '8 days',  NOW() - INTERVAL '1 day');

INSERT INTO products (id, brand, name, description, price, category, created_at, updated_at) VALUES
  ('f1a3b5c7-d9e1-4f2a-8b3c-5d7e9f1a2b10', 'CeraGlow', 'Hydrating Gel Cleanser', 'Gentle daily cleanser for normal to dry skin.', 12.50, 'cleanser', NOW() - INTERVAL '14 days', NOW() - INTERVAL '1 day'),
  ('a2b4c6d8-e1f3-4a5b-9c2d-6e8f1a3b4c21', 'DermaCalm', 'Soothing Toner', 'Alcohol-free toner for sensitive skin.', 16.00, 'toner', NOW() - INTERVAL '14 days', NOW() - INTERVAL '2 days'),
  ('b3c5d7e9-f1a2-4b6c-8d3e-7f9a2b4c5d32', 'SunAura', 'SPF50 Daily Sunscreen', 'Lightweight sunscreen with broad spectrum protection.', 22.90, 'sunscreen', NOW() - INTERVAL '13 days', NOW() - INTERVAL '1 day'),
  ('c4d6e8f1-a2b3-4c7d-9e4f-8a1b3c5d6e43', 'PureLeaf', 'Niacinamide 10% Serum', 'Oil-control serum for uneven texture.', 19.90, 'serum', NOW() - INTERVAL '12 days', NOW() - INTERVAL '1 day'),
  ('d5e7f9a2-b3c4-4d8e-8f5a-9b2c4d6e7f54', 'NightBloom', 'Retinol Night Cream', 'Beginner-friendly retinol cream for evening routine.', 29.90, 'moisturizer', NOW() - INTERVAL '12 days', NOW() - INTERVAL '2 days'),
  ('e6f8a1b3-c4d5-4e9f-9a6b-1c3d5e7f8a65', 'AquaMist', 'Hyaluronic Essence', 'Hydration essence with multi-weight hyaluronic acid.', 24.50, 'essence', NOW() - INTERVAL '11 days', NOW() - INTERVAL '3 days'),
  ('f7a9b2c4-d5e6-4f1a-8b7c-2d4e6f8a9b76', 'HerbalSkin', 'Tea Tree Spot Gel', 'Targeted gel for occasional blemishes.', 9.90, 'treatment', NOW() - INTERVAL '10 days', NOW() - INTERVAL '1 day'),
  ('a8b1c3d5-e6f7-4a2b-9c8d-3e5f7a9b1c87', 'VelvetTouch', 'Ceramide Moisture Cream', 'Barrier-support cream for dry and sensitive skin.', 27.00, 'moisturizer', NOW() - INTERVAL '9 days', NOW() - INTERVAL '1 day');

-- No inserts into photos by request.
-- (When image assets are available later, insert photos with explicit UUIDs
--  and set is_primary/sort_order/is_active according to display rules.)

INSERT INTO reviews (id, user_id, product_id, title, content, rating, status, ai_label, final_label, created_at, updated_at) VALUES
  ('b1d2e3f4-a5b6-4c7d-8e9f-1029384756a1', 'a3f6e2b1-8d7c-4a2b-9f0d-5c1a7e6b9d10', 'f1a3b5c7-d9e1-4f2a-8b3c-5d7e9f1a2b10', 'Great daily cleanser', 'Very gentle and does not dry my skin.', 5, 'done', true, true, NOW() - INTERVAL '7 days', NOW() - INTERVAL '6 days'),
  ('c2e3f4a5-b6c7-4d8e-9f1a-2039485761b2', 'b9c4d7a2-3e1f-45ad-8c21-6f7a2d1b4e33', 'b3c5d7e9-f1a2-4b6c-8d3e-7f9a2b4c5d32', 'No white cast', 'Absorbs quickly and works well under makeup.', 5, 'done', true, true, NOW() - INTERVAL '6 days', NOW() - INTERVAL '5 days'),
  ('d3f4a5b6-c7d8-4e9f-8a2b-3049586712c3', 'c1a8f5d4-2b6e-4f7a-91cd-8e2b6d3f7a44', 'c4d6e8f1-a2b3-4c7d-9e4f-8a1b3c5d6e43', 'Helped oil control', 'Skin feels less greasy by midday.', 4, 'done', true, true, NOW() - INTERVAL '6 days', NOW() - INTERVAL '4 days'),
  ('e4a5b6c7-d8e9-4f1a-9b3c-4059687123d4', 'd4e2a9b7-5c3f-4d1a-8b9e-1f6c3a7d8b55', 'd5e7f9a2-b3c4-4d8e-8f5a-9b2c4d6e7f54', 'Too strong at first', 'Needed to use less often during first week.', 3, 'done', false, false, NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days'),
  ('f5b6c7d8-e9f1-4a2b-8c4d-5069781234e5', 'e7b1c3d5-9a4f-4b2d-8e1c-3a9f6d2b1c66', 'a8b1c3d5-e6f7-4a2b-9c8d-3e5f7a9b1c87', 'Very moisturizing', 'Worked well for my dry cheeks.', 5, 'done', true, true, NOW() - INTERVAL '4 days', NOW() - INTERVAL '3 days'),
  ('a6c7d8e9-f1a2-4b3c-9d5e-6079812345f6', 'a3f6e2b1-8d7c-4a2b-9f0d-5c1a7e6b9d10', 'e6f8a1b3-c4d5-4e9f-9a6b-1c3d5e7f8a65', 'Nice texture', 'Layers well with serum and cream.', 4, 'pending', NULL, NULL, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
  ('b7d8e9f1-a2b3-4c4d-8e6f-7089123456a7', 'b9c4d7a2-3e1f-45ad-8c21-6f7a2d1b4e33', 'f7a9b2c4-d5e6-4f1a-8b7c-2d4e6f8a9b76', 'Works on spots', 'Reduced redness overnight.', 4, 'pending', NULL, NULL, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
  ('c8e9f1a2-b3c4-4d5e-9f7a-8091234567b8', 'c1a8f5d4-2b6e-4f7a-91cd-8e2b6d3f7a44', 'a2b4c6d8-e1f3-4a5b-9c2d-6e8f1a3b4c21', 'Calming toner', 'No irritation and smells neutral.', 5, 'done', true, true, NOW() - INTERVAL '5 days', NOW() - INTERVAL '3 days');

INSERT INTO orders (id, user_id, total_amount, status, created_at, updated_at) VALUES
  ('d1e2f3a4-b5c6-4d7e-8f9a-9101112131a1', 'a3f6e2b1-8d7c-4a2b-9f0d-5c1a7e6b9d10', 35.40, 'completed', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days'),
  ('e2f3a4b5-c6d7-4e8f-9a1b-0211213141b2', 'b9c4d7a2-3e1f-45ad-8c21-6f7a2d1b4e33', 52.80, 'completed', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
  ('f3a4b5c6-d7e8-4f9a-8b2c-1314151617c3', 'c1a8f5d4-2b6e-4f7a-91cd-8e2b6d3f7a44', 19.90, 'pending',   NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
  ('a4b5c6d7-e8f9-4a1b-9c3d-2425262728d4', 'd4e2a9b7-5c3f-4d1a-8b9e-1f6c3a7d8b55', 24.50, 'cancelled', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),
  ('b5c6d7e8-f9a1-4b2c-8d4e-3536373839e5', 'e7b1c3d5-9a4f-4b2d-8e1c-3a9f6d2b1c66', 61.50, 'completed', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days');

INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, created_at) VALUES
  ('c6d7e8f9-a1b2-4c3d-9e5f-4647484950f1', 'd1e2f3a4-b5c6-4d7e-8f9a-9101112131a1', 'f1a3b5c7-d9e1-4f2a-8b3c-5d7e9f1a2b10', 1, 12.50, NOW() - INTERVAL '6 days'),
  ('d7e8f9a1-b2c3-4d4e-8f6a-5758596061a2', 'd1e2f3a4-b5c6-4d7e-8f9a-9101112131a1', 'b3c5d7e9-f1a2-4b6c-8d3e-7f9a2b4c5d32', 1, 22.90, NOW() - INTERVAL '6 days'),
  ('e8f9a1b2-c3d4-4e5f-9a7b-6869707172b3', 'e2f3a4b5-c6d7-4e8f-9a1b-0211213141b2', 'a8b1c3d5-e6f7-4a2b-9c8d-3e5f7a9b1c87', 1, 27.00, NOW() - INTERVAL '5 days'),
  ('f9a1b2c3-d4e5-4f6a-8b8c-7970717273c4', 'e2f3a4b5-c6d7-4e8f-9a1b-0211213141b2', 'c4d6e8f1-a2b3-4c7d-9e4f-8a1b3c5d6e43', 1, 19.90, NOW() - INTERVAL '5 days'),
  ('a1b2c3d4-e5f6-4a7b-9c9d-8081828384d5', 'e2f3a4b5-c6d7-4e8f-9a1b-0211213141b2', 'f7a9b2c4-d5e6-4f1a-8b7c-2d4e6f8a9b76', 1, 9.90, NOW() - INTERVAL '5 days'),
  ('b2c3d4e5-f6a7-4b8c-8d1e-9192939495e6', 'f3a4b5c6-d7e8-4f9a-8b2c-1314151617c3', 'c4d6e8f1-a2b3-4c7d-9e4f-8a1b3c5d6e43', 1, 19.90, NOW() - INTERVAL '2 days'),
  ('c3d4e5f6-a7b8-4c9d-9e2f-1029384756f7', 'a4b5c6d7-e8f9-4a1b-9c3d-2425262728d4', 'e6f8a1b3-c4d5-4e9f-9a6b-1c3d5e7f8a65', 1, 24.50, NOW() - INTERVAL '4 days'),
  ('d4e5f6a7-b8c9-4d1e-8f3a-2131415161a8', 'b5c6d7e8-f9a1-4b2c-8d4e-3536373839e5', 'a8b1c3d5-e6f7-4a2b-9c8d-3e5f7a9b1c87', 1, 27.00, NOW() - INTERVAL '3 days'),
  ('e5f6a7b8-c9d1-4e2f-9a4b-3242526272b9', 'b5c6d7e8-f9a1-4b2c-8d4e-3536373839e5', 'b3c5d7e9-f1a2-4b6c-8d3e-7f9a2b4c5d32', 1, 22.90, NOW() - INTERVAL '3 days'),
  ('f6a7b8c9-d1e2-4f3a-8b5c-4353637383c0', 'b5c6d7e8-f9a1-4b2c-8d4e-3536373839e5', 'f1a3b5c7-d9e1-4f2a-8b3c-5d7e9f1a2b10', 1, 12.50, NOW() - INTERVAL '3 days');

COMMIT;

