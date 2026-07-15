package price_sync.console;

import java.time.OffsetDateTime;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

import price_sync.domain.BatchStatus;

public record EventDetail(
        @JsonProperty("id") Long id,
        @JsonProperty("batch_id") String batchId,
        @JsonProperty("version") int version,
        @JsonProperty("status") BatchStatus status,
        @JsonProperty("generated_at") OffsetDateTime generatedAt,
        @JsonProperty("records") List<EventRecord> records) {
}
