ALTER TABLE reviews
    ADD CONSTRAINT reviews_status_check
        CHECK (status IN ('pending', 'done'));
