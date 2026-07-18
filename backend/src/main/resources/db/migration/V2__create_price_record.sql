CREATE TABLE price_record (
    id BIGSERIAL PRIMARY KEY,
    batch_id BIGINT NOT NULL REFERENCES price_batch(id),
    change_id VARCHAR(100) NOT NULL,
    version INTEGER NOT NULL,
    item_id VARCHAR(100) NOT NULL,
    store_id_or_zone VARCHAR(100) NOT NULL,
    price NUMERIC(12,2),
    currency VARCHAR(3),
    effective_start DATE,
    effective_end DATE,
    change_type VARCHAR(10) NOT NULL,
    CONSTRAINT uq_change UNIQUE (change_id, version)
);

CREATE INDEX ix_record_batch ON price_record (batch_id);
