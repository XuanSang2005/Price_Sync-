package price_sync.domain.batch;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;


public interface BatchLogRepository extends JpaRepository<BatchLog, Long>{
    List<BatchLog>findByBatchIdOrderByCreatedAtAsc(Long batchId);

    // Toàn bộ nhật ký, mới nhất trước — cho trang Logs toàn cục
    List<BatchLog> findAllByOrderByCreatedAtDesc();
}
