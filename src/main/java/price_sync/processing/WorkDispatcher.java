package price_sync.processing;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import price_sync.domain.PriceBatch;
import price_sync.domain.PriceBatchRepository;
import price_sync.domain.PriceRecordRepository;
import price_sync.domain.PriceRecord;

@Component
public class WorkDispatcher {

    private final Validator validator;
    private static final Logger log = LoggerFactory.getLogger(WorkDispatcher.class);
    private final PriceBatchRepository priceBatchRepository;
    private final PriceRecordRepository priceRecordRepository;
    private final String instanceId = UUID.randomUUID().toString().substring(0, 8);

    public WorkDispatcher(PriceBatchRepository priceBatchRepository, PriceRecordRepository priceRecordRepository,
            Validator validator) {
        this.priceBatchRepository = priceBatchRepository;
        this.priceRecordRepository = priceRecordRepository;
        this.validator = validator;
    }

    @Scheduled(fixedDelay = 10_000)
    @Transactional
    public void poll() {
        log.info("Dispatcher thuc day, dang tim viec");
        Optional<PriceBatch> next = priceBatchRepository.findNextToClaim();
        if ((next.isEmpty())) {
            log.info("khong co viec");
            return;
        }
        PriceBatch batch = next.get();
        log.info("Da nhan batch id={}, batch_id={}", batch.getId(), batch.getBatchId());
        batch.markProcessing(instanceId);
        log.info("Instance dang hoat dong", instanceId);

        List<PriceRecord> records = priceRecordRepository.findByBatchId(batch.getId());
        int valid = 0, setAside = 0;
        for (PriceRecord priceRecord : records) {
            Optional<String> result = validator.validate((priceRecord));
            if (result.isEmpty()) {
                priceRecord.markValid();
                valid++;
            } else {
                priceRecord.setAside(result.get());
                setAside++;
            }
        }
        log.info("Batch {} kiem dinh xong: {} VALID, {} SET_ASIDE", batch.getId(), valid, setAside);
    }

    @Scheduled(fixedDelay = 60_000)
    @Transactional
    public void reap() {
        int count = priceBatchRepository.reclaimExpired();
        if (count > 0) {
            log.warn("Reaper hoi sinh {} batch bi bo roi", count);
        }
    }
}
