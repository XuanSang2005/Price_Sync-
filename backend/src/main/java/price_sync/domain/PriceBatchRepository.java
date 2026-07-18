package price_sync.domain;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface PriceBatchRepository extends JpaRepository<PriceBatch, Long> {
    @Query(value = """
            SELECT * FROM price_batch
    WHERE status = 'RECEIVED'
    ORDER BY
    id LIMIT 1
    FOR UPDATE SKIP LOCKED
    """, nativeQuery = true)
    Optional<PriceBatch> findNextToClaim();

    @Modifying
    @Query(value = """
        UPDATE price_batch
        SET status = 'RECEIVED', owner_instance = NULL, claimed_at = NULL
        WHERE status IN ('PROCESSING', 'WRITING')
            AND claimed_at < now() - interval '5 minutes'
            """, nativeQuery = true)
    int reclaimExpired();

    @Query(value = """
            SELECT * FROM price_batch
    WHERE status = 'PENDING_WRITE' AND next_retry_at <= now()
    ORDER BY next_retry_at
    LIMIT 1
    FOR UPDATE SKIP LOCKED
    """, nativeQuery = true)
    Optional<PriceBatch> findNextToRetry();
}
