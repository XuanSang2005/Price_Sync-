package price_sync.console;

import java.time.OffsetDateTime;

import com.fasterxml.jackson.annotation.JsonProperty;

import price_sync.domain.BatchStatus;

public record EventSummary(Long id, @JsonProperty("batch_id") String batchId, int version, BatchStatus status, @JsonProperty("generated_at") OffsetDateTime generatedAt) {
}
