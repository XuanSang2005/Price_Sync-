package price_sync.console;

import price_sync.console.dto.EventSummary;
import price_sync.console.dto.EventDetail;
import price_sync.console.dto.EventRecord;
import price_sync.console.dto.EventLog;
import price_sync.console.dto.EventFile;
import price_sync.console.dto.GlobalLog;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import price_sync.domain.batch.BatchLogRepository;
import price_sync.domain.batch.BatchStatus;
import price_sync.domain.config.ConfigRepository;
import price_sync.domain.batch.PriceBatch;
import price_sync.domain.batch.PriceBatchRepository;
import price_sync.domain.record.PriceRecordRepository;
import price_sync.intake.error.InValidIdException;

@Service
public class EventService {
    private final BatchLogRepository batchLogRepository;
    private final PriceBatchRepository priceBatchRepository;
    private final PriceRecordRepository priceRecordRepository;
    private final ConfigRepository configRepository;

    public EventService(PriceBatchRepository priceBatchRepository, PriceRecordRepository priceRecordRepository,
            BatchLogRepository batchLogRepository, ConfigRepository configRepository) {
        this.priceBatchRepository = priceBatchRepository;
        this.priceRecordRepository = priceRecordRepository;
        this.batchLogRepository = batchLogRepository;
        this.configRepository = configRepository;
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
                        record.getVersion(),
                        record.getItemId(),
                        record.getStoreIdOrZone(),
                        record.getPrice(),
                        record.getCurrency(),
                        record.getEffectiveStart(),
                        record.getEffectiveEnd(),
                        record.getChangeType(),
                        record.getValidationStatus(),
                        record.getSetAsideReason(),
                        record.getExtras()))
                .toList();
        return new EventDetail(batch.getId(), batch.getBatchId(), batch.getVersion(), batch.getStatus(),
                batch.getGeneratedAt(), batch.getRetryCount(), batch.getOutputFile(), records);
    }

    // Đọc THẬT nội dung file MNT đã ghi ra cho batch (không dựng lại ở UI).
    public EventFile getFile(Long id) {
        PriceBatch batch = priceBatchRepository.findById(id).orElseThrow(InValidIdException::new);
        String fileName = batch.getOutputFile();
        if (fileName == null) {
            return new EventFile(null, false, null, "No file yet (batch not WRITTEN/PARTIAL).");
        }
        String dir = configRepository.findByConfigKey("xcenter_inbound_path")
                .map(c -> c.getConfigValue()).orElse("xcenter-inbound");
        Path path = Path.of(dir, fileName);
        try {
            if (!Files.exists(path)) {
                return new EventFile(fileName, false, null, "File not on disk (cleaned or replaced).");
            }
            return new EventFile(fileName, true, Files.readString(path), null);
        } catch (IOException e) {
            return new EventFile(fileName, false, null, "Cannot read file: " + e.getMessage());
        }
    }

    public Map<BatchStatus, Long> getMetrics() {
        Map<BatchStatus, Long> statusCount = priceBatchRepository.findAll().stream()
                .collect(Collectors.groupingBy(PriceBatch::getStatus, Collectors.counting()));
        for (BatchStatus status : BatchStatus.values()) {
            statusCount.putIfAbsent(status, 0L);
        }
        return statusCount;
    }

    public List<EventLog> getLogs(Long batchId) {
        priceBatchRepository.findById(batchId).orElseThrow(InValidIdException::new);
        return batchLogRepository.findByBatchIdOrderByCreatedAtAsc(batchId).stream()
                .map(l -> new EventLog(l.getStatus(), l.getNote(), l.getCreatedAt()))
                .toList();
    }

    // Nhật ký vòng đời của MỌI batch, mới nhất trước — cho trang Logs toàn cục.
    public List<GlobalLog> getAllLogs() {
        // Bản đồ id nội bộ -> mã batch nghiệp vụ, để hiện id thân thiện
        Map<Long, String> batchIdByPk = new HashMap<>();
        for (PriceBatch b : priceBatchRepository.findAll()) {
            batchIdByPk.put(b.getId(), b.getBatchId());
        }
        return batchLogRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(l -> new GlobalLog(
                        l.getBatchId(),
                        batchIdByPk.getOrDefault(l.getBatchId(), "?"),
                        l.getStatus(),
                        l.getNote(),
                        l.getCreatedAt()))
                .toList();
    }
}
