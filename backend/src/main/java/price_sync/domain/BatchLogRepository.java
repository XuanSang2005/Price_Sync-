package price_sync.domain;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;


public interface BatchLogRepository extends JpaRepository<BatchLog, Long>{
    List<BatchLog>findByBatchIdOrderByCreatedAtAsc(Long batchId);
}
