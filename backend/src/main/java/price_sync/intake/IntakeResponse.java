package price_sync.intake;

import com.fasterxml.jackson.annotation.JsonProperty;

import price_sync.domain.BatchStatus;

public record IntakeResponse(
        @JsonProperty("batch_id") String batchId,
        int version,
        BatchStatus status,
        @JsonProperty("received_records") int receivedRecords) {
}
