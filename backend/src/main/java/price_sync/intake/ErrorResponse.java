package price_sync.intake;

import java.time.OffsetDateTime;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ErrorResponse (
    String error, 
    String message,
    @JsonProperty("batch_id") String batchId,
    int version,
    OffsetDateTime ts
){}
