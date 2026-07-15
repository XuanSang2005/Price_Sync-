CREATE TABLE batch_
log (
    id BIGSERIAL PRIMARY KEY,
    batch_id BIGINT NOT NULL REFERENCES price_batch(id),
    status VARCHAR NOT NULL,
    note VARCHAR,
    created_at TIMESTAMPTZ NOT NULL default now()
);