package price_sync.domain;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PriceRecordRepository extends JpaRepository<PriceRecord, Long>{
    List<PriceRecord>findByBatchId(Long bachId);
    List<PriceRecord>findByBatchIdAndValidationStatus(Long batchId, RecordStatus status);
}
