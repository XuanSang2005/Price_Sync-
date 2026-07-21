package price_sync.console.dto;

import java.time.OffsetDateTime;

import com.fasterxml.jackson.annotation.JsonProperty;

import price_sync.domain.batch.BatchStatus;

// Một dòng nhật ký vòng đời của MỌI batch (GET /api/v1/logs) — cho trang Logs toàn cục.
// Kèm batch_id (mã nghiệp vụ) để hiện được id thân thiện, không chỉ khoá nội bộ.
public record GlobalLog(
        @JsonProperty("event_id") Long eventId,
        @JsonProperty("batch_id") String batchId,
        @JsonProperty("status") BatchStatus status,
        @JsonProperty("note") String note,
        @JsonProperty("created_at") OffsetDateTime createdAt) {
}
