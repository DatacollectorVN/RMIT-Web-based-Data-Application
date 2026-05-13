ALTER TABLE users
    ADD COLUMN IF NOT EXISTS gender VARCHAR(10) NULL
        CHECK (gender IN ('male', 'female'));
