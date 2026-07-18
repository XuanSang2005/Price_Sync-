CREATE TABLE price_batch(
    id BIGSERIAL PRIMARY KEY,
    batch_id VARCHAR(100) NOT NULL,
    version INTEGER NOT NULL,
    generated_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL,
    CONSTRAINT uq_batch UNIQUE(batch_id, version)
);
