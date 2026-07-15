package price_sync.console;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import price_sync.domain.BatchLogRepository;
import price_sync.domain.BatchStatus;
import price_sync.domain.PriceBatch;
import price_sync.domain.PriceBatchRepository;
import price_sync.domain.PriceRecordRepository;
import price_sync.intake.InValidIdException;

@Service
public class EventService {
    private final BatchLogRepository batchLogRepository;
    private final PriceBatchRepository priceBatchRepository;
    private final PriceRecordRepository priceRecordRepository;

    public EventService(PriceBatchRepository priceBatchRepository, PriceRecordRepository priceRecordRepository, BatchLogRepository batchLogRepository) {
        this.priceBatchRepository = priceBatchRepository;
        this.priceRecordRepository = priceRecordRepository;
        this.batchLogRepository = batchLogRepository;
    }

    public List<EventSummary> getEvents() {
        return priceBatchRepository.findAll().stream().map(batch -> new EventSummary(
                batch.getId(),
                batch.getBatchId(),
                batch.getVersion(),
                batch.getStatus(),
                batch.getGeneratedAt())).toList();
    }

    public EventDetail getEventDetails(Long id) {
        PriceBatch batch = priceBatchRepository.findById(id).orElseThrow(InValidIdException::new);
        List<EventRecord> records = priceRecordRepository.findByBatchId(batch.getId()).stream()
                .map(record -> new EventRecord(
                        record.getChangeId(),
                        record.getItemId(),
                        record.getStoreIdOrZone(),
                        record.getValidationStatus(),
                        record.getSetAsideReason()))
                .toList();
        return new EventDetail(batch.getId(), batch.getBatchId(), batch.getVersion(), batch.getStatus(),
                batch.getGeneratedAt(), records);
    }

    public Map<BatchStatus, Long> getMetrics() {
        Map<BatchStatus, Long> statusCount = priceBatchRepository.findAll().stream()
                .collect(Collectors.groupingBy(PriceBatch::getStatus, Collectors.counting()));
        for (BatchStatus status : BatchStatus.values()){
            statusCount.putIfAbsent(status, 0L);
        }
        return statusCount;
    }

    public List<EventLog> getLogs(Long batchId){
        priceBatchRepository.findById(batchId).orElseThrow(InValidIdException::new);
        return batchLogRepository.findByBatchIdOrderByCreatedAtAsc(batchId).stream()
                .map(l -> new EventLog(l.getStatus(), l.getNote(), l.getCreatedAt()))
                .toList();
    }
}
