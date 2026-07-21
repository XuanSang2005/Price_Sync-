package price_sync.console.dto;

import java.time.OffsetDateTime;

import com.fasterxml.jackson.annotation.JsonProperty;

import price_sync.domain.batch.BatchStatus;

public record EventLog(
        @JsonProperty("status") BatchStatus status,
        @JsonProperty("note") String note,
        @JsonProperty("created_at") OffsetDateTime createdAt) {
}
