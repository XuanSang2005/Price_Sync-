ALTER TABLE price_record
    ADD COLUMN validation_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    ADD COLUMN set_aside_reason VARCHAR(100);