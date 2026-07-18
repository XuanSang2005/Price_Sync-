ALTER TABLE price_batch 
        ADD COLUMN owner_instance VARCHAR(50),
        ADD COLUMN claimed_at TIMESTAMPTZ;
CREATE INDEX ix_batch_lease ON price_batch (claimed_at)
WHERE status IN ('PROCESSING', 'WRITING');