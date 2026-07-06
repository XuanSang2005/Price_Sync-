package price_sync.intake;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.fasterxml.jackson.annotation.JsonProperty;

public record PriceRecordRequest(@JsonProperty("change_id") String changeId, int version,
        @JsonProperty("item_id") String itemId, @JsonProperty("store_id_or_zone") String storeIdOrZone,
        BigDecimal price, @JsonProperty("currency") String currency,
        @JsonProperty("effective_start") LocalDate effectiveStart,
        @JsonProperty("effective_end") LocalDate effectiveEnd, @JsonProperty("change_type") String changeType) {

}
