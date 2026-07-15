package price_sync.console;

import java.util.List;

import org.springframework.stereotype.Service;

import price_sync.domain.PriceBatch;
import price_sync.domain.PriceBatchRepository;
import price_sync.domain.PriceRecordRepository;
import price_sync.intake.InValidIdException;

@Service
public class EventService {
    private final PriceBatchRepository priceBatchRepository;
    private final PriceRecordRepository priceRecordRepository;

    public EventService(PriceBatchRepository priceBatchRepository, PriceRecordRepository priceRecordRepository){
        this.priceBatchRepository = priceBatchRepository;
        this.priceRecordRepository = priceRecordRepository;

    }
    public List<EventSummary> getEvents(){
        return priceBatchRepository.findAll().stream().map(batch -> new EventSummary(
            batch.getId(),
            batch.getBatchId(),
            batch.getVersion(),
            batch.getStatus(),
            batch.getGeneratedAt()
        )).toList();
    }

    public EventDetail getEventDetails(Long id){
        PriceBatch batch = priceBatchRepository.findById(id).orElseThrow(InValidIdException::new);
        List<EventRecord>records = priceRecordRepository.findByBatchId(batch.getId()).stream().map(record -> new EventRecord(
            record.getChangeId(),
            record.getItemId(),
            record.getStoreIdOrZone(),
            record.getValidationStatus(),
            record.getSetAsideReason()
        )).toList();
        return new EventDetail(batch.getId(), batch.getBatchId(), batch.getVersion(), batch.getStatus(), batch.getGeneratedAt(), records);
    }
}
