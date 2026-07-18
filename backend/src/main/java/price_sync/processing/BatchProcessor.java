package price_sync.processing;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import price_sync.domain.BatchLog;
import price_sync.domain.BatchLogRepository;
import price_sync.domain.BatchStatus;
import price_sync.domain.ConfigRepository;
import price_sync.domain.PriceBatch;
import price_sync.domain.PriceBatchRepository;
import price_sync.domain.PriceRecord;
import price_sync.domain.PriceRecordRepository;
import price_sync.domain.RecordStatus;
import price_sync.intake.InValidIdException;

@Component
public class BatchProcessor {
    private static final Logger log = LoggerFactory.getLogger(BatchProcessor.class);
    private final PriceRecordRepository priceRecordRepository;
    private final PriceBatchRepository priceBatchRepository;
    private final Validator validator;
    private final Mapper mapper;
    private final PayloadBuilder payloadBuilder;
    private final OutputWriter outputWriter;
    private final BatchLogRepository batchLogRepository;
    private final ConfigRepository configRepository;

    public BatchProcessor(PriceRecordRepository priceRecordRepository, Validator validator,
            PriceBatchRepository priceBatchRepository, Mapper mapper, PayloadBuilder payloadBuilder,
            OutputWriter outputWriter, BatchLogRepository batchLogRepository, ConfigRepository configRepository) {
        this.priceRecordRepository = priceRecordRepository;
        this.validator = validator;
        this.priceBatchRepository = priceBatchRepository;
        this.mapper = mapper;
        this.payloadBuilder = payloadBuilder;
        this.outputWriter = outputWriter;
        this.batchLogRepository = batchLogRepository;
        this.configRepository = configRepository;
    }

    @Transactional
    public Optional<PriceBatch> claimNext(String owner) {
        Optional<PriceBatch> next = priceBatchRepository.findNextToClaim();
        if (next.isEmpty()) {
            return next;
        }
        PriceBatch batch = next.get();
        batch.markProcessing(owner);
        recordLog(batch.getId(), batch.getStatus(), owner);

        return next;
    }

    @Transactional
    public Optional<PriceBatch> claimForRetry(String owner) {
        Optional<PriceBatch> next = priceBatchRepository.findNextToRetry();
        if (next.isEmpty()) {
            return next;
        }
        PriceBatch batch = next.get();
        batch.markProcessing(owner);
        recordLog(batch.getId(), batch.getStatus(), "retry claim");
        return next;
    }

    @Transactional
    public boolean validateBatch(@NonNull Long batchId) {
        int valid = 0, setAside = 0;
        PriceBatch batch = priceBatchRepository.findById(batchId).get();

        List<PriceRecord> records = priceRecordRepository.findByBatchId(batchId);
        for (PriceRecord record : records) {
            Optional<String> reason = validator.validate(record);
            if (reason.isEmpty()) {
                record.markValid();
                valid++;
            } else {
                record.setAside(reason.get());
                setAside++;
            }
        }
        double threshold = configRepository.findByConfigKey("abort_threshold")
                .map(c -> Double.parseDouble((c.getConfigValue()))).orElse(0.2);
        double failRate = (double) setAside / (valid + setAside);
        if (failRate > threshold || valid == 0) {
            batch.markFail();
            log.warn("Batch {} BI HUY: {}/{} records set aside (ti le hong {}%)",
                    batchId, setAside, records.size(), Math.round(failRate * 100));
            recordLog(batch.getId(), batch.getStatus(), setAside + "/" + records.size() + " set aside");
            return false;
        } else {
            log.info("Batch {} qua kiem dinh: {} VALID, {} SET_ASIDE - san sang cho Mapper",
                    batchId, valid, setAside);
            return true;
        }
    }

    @Transactional
    public void mapBatch(@NonNull Long batchId) throws IOException {
        PriceBatch batch = priceBatchRepository.findById(batchId).get();
        LocalDate businessDate = batch.getGeneratedAt().toLocalDate();
        List<MntRow> rows = new ArrayList<>();
        List<PriceRecord> records = priceRecordRepository.findByBatchIdAndValidationStatus(batchId, RecordStatus.VALID);
        boolean hasSetAside = false;
        Map<String, Integer> maxVersion = new HashMap<>();
        for (PriceRecord record : records) {
            maxVersion.merge(record.getChangeId(), record.getVersion(), Math::max);
        }

        for (PriceRecord record : records) {
            if (record.getVersion() < maxVersion.get(record.getChangeId())) {
                record.markSupersede();
                continue;
            }
            Optional<MntRow> result = mapper.map(record, businessDate);
            if (result.isEmpty()) {
                record.setAside("UNMAPPABLE_REASON");
                hasSetAside = true;

            } else {
                rows.add(result.get());
            }
        }
        Path tempFile = payloadBuilder.build(rows, businessDate);
        Path finalFile = outputWriter.write(tempFile, batch);
        Files.deleteIfExists(tempFile); 
        log.info("Da ghi file MNT: {}", finalFile);
        if (hasSetAside) {
            batch.markPartial();
        } else {
            batch.markWritten();
        }
        recordLog(batch.getId(), batch.getStatus(), null);
    }

    @Transactional
    public void markPendingWrite(@NonNull Long bachtId) {
        PriceBatch batch = priceBatchRepository.findById(bachtId).get();
        batch.markPendingWrite();
        recordLog(batch.getId(), batch.getStatus(), "write fail, retry " + batch.getRetryCount());
        if (batch.getStatus() == BatchStatus.FAILED) {
            log.error("CHUONG: Batch {} FAILED sau {} lan ghi that bai - can nguoi xu ly", bachtId,
                    batch.getRetryCount());
        }
    }

    @Transactional
    public boolean retry(Long bacthId) {
        PriceBatch batch = priceBatchRepository.findById(bacthId).orElseThrow(InValidIdException::new);
        if (batch.getStatus() == BatchStatus.FAILED) {
            batch.redrive();
            recordLog(batch.getId(), batch.getStatus(), "operator re-drive");
            return true;
        }
        return false;
    }

    private void recordLog(Long batchId, BatchStatus status, String note) {
        batchLogRepository.save(new BatchLog(batchId, status, note));
    }

}
