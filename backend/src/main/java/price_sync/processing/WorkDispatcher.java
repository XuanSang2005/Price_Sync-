package price_sync.processing;

import java.io.IOException;
import java.util.Optional;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import price_sync.domain.PriceBatch;
import price_sync.domain.PriceBatchRepository;

@Component
public class WorkDispatcher {

    private final BatchProcessor batchProcessor;
    private static final Logger log = LoggerFactory.getLogger(WorkDispatcher.class);
    private final PriceBatchRepository priceBatchRepository;
    private final String instanceId = UUID.randomUUID().toString().substring(0, 8);

    public WorkDispatcher(PriceBatchRepository priceBatchRepository, BatchProcessor batchProcessor) {
        this.priceBatchRepository = priceBatchRepository;
        this.batchProcessor = batchProcessor;
    }

    @Scheduled(fixedDelay = 10_000)
    public void poll() {
        log.info("Dispatcher thuc day, dang tim viec");
        Optional<PriceBatch> optionalBatch = batchProcessor.claimNext(instanceId);
        if (optionalBatch.isEmpty()) {
            log.info("khong co viec");
            return;
        }

        PriceBatch batch = optionalBatch.get();
        log.info("Da nhan batch id={}, batch_id={}, owner={}", batch.getId(), batch.getBatchId(), instanceId);
        if (batchProcessor.validateBatch(batch.getId())) {
            try {
                batchProcessor.mapBatch(batch.getId());
            } catch (IOException e) {
                log.error("Loi ghi file MNT cho batch {}", batch.getId(), e);
                batchProcessor.markPendingWrite(batch.getId());
            }
        }
    }

    @Scheduled(fixedDelay = 60_000)
    @Transactional
    public void reap() {
        int count = priceBatchRepository.reclaimExpired();
        if (count > 0) {
            log.warn("Reaper hoi sinh {} batch bi bo roi", count);
        }
    }

    @Scheduled(fixedDelay = 15_000)
    public void retryPending() {
        Optional<PriceBatch> optionalBatch = batchProcessor.claimForRetry(instanceId);
        if (optionalBatch.isEmpty())
            return;
        PriceBatch batch = optionalBatch.get();
        log.info("Retry batch id={}", batch.getId());
        try {
            batchProcessor.mapBatch(batch.getId()); 
        } catch (IOException e) {
            log.error("Retry ghi loi, batch {} ve PENDING_WRITE", batch.getId(), e);
            batchProcessor.markPendingWrite(batch.getId());
        }

    }
}
