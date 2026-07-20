package price_sync.intake;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import price_sync.domain.BatchLog;
import price_sync.domain.BatchLogRepository;
import price_sync.domain.MappingRuleRepository;
import price_sync.domain.PriceBatch;
import price_sync.domain.PriceBatchRepository;
import price_sync.domain.PriceRecord;
import price_sync.domain.PriceRecordRepository;

@Service
public class IntakeService {
    private final PriceRecordRepository priceRecordRepository;
    private final PriceBatchRepository batchRepository;
    private final BatchLogRepository batchLogRepository;
    private final MappingRuleRepository mappingRuleRepository;

    public IntakeService(PriceBatchRepository batchRepository, PriceRecordRepository priceRecordRepository,
            BatchLogRepository batchLogRepository, MappingRuleRepository mappingRuleRepository) {
        this.batchRepository = batchRepository;
        this.priceRecordRepository = priceRecordRepository;
        this.batchLogRepository = batchLogRepository;
        this.mappingRuleRepository = mappingRuleRepository;
    }

    @Transactional
    public PriceBatch accept(PriceBatchRequest batch) {
        PriceBatch batchEntity = new PriceBatch(batch.batchId(), batch.version(), batch.generatedAt());
        PriceBatch saved;
        try {
            saved = batchRepository.save(batchEntity);
        } catch (DataIntegrityViolationException e) {
            throw new DuplicateBatchException(batch.batchId(), batch.version());
        }
        List<PriceRecord> records = new ArrayList<>();
        Long parentId = saved.getId();
        for (PriceRecordRequest record : batch.records()) {
            Map<String, Object> raw = record.extras();
            Map<String, Object> declared = null; 
            if (raw != null) {
                declared = new HashMap<>();
                for (Map.Entry<String, Object> e : raw.entrySet()) {
                    if (mappingRuleRepository.existsByJsonField(e.getKey())) {
                        declared.put(e.getKey(), e.getValue()); 
                    }
                }
            }

            records.add(new PriceRecord(parentId, record.changeId(), record.version(), record.itemId(),
                    record.storeIdOrZone(), record.price(), record.currency(), record.effectiveStart(),
                    record.effectiveEnd(), record.changeType(), declared));
        }
        priceRecordRepository.saveAll(records);
        batchLogRepository.save(new BatchLog(saved.getId(), saved.getStatus(), batch.records().size() + " records"));
        return saved;
    }
}
