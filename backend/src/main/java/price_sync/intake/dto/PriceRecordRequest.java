package price_sync.intake.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonProperty;

public record PriceRecordRequest(@JsonProperty("change_id") String changeId, int version,
                @JsonProperty("item_id") String itemId, @JsonProperty("store_id_or_zone") String storeIdOrZone,
                BigDecimal price, @JsonProperty("currency") String currency,
                @JsonProperty("effective_start") LocalDate effectiveStart,
                @JsonProperty("effective_end") LocalDate effectiveEnd, @JsonProperty("change_type") String changeType,
                @JsonAnySetter Map<String, Object> extras) {

}
