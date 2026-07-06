package price_sync.intake;

import java.time.OffsetDateTime;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

public record PriceBatchRequest(
        @JsonProperty("batch_id") String batchId,
        int version,
        @JsonProperty("generated_at") OffsetDateTime generatedAt,
        List<PriceRecordRequest> records) {
}
