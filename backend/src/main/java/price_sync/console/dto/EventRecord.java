package price_sync.console.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonProperty;

import price_sync.domain.record.RecordStatus;

// Một dòng giá trong batch. Đủ field để console dựng lại payload JSON gốc (dữ liệu thật, không bịa).
public record EventRecord(
        @JsonProperty("change_id") String changeId,
        @JsonProperty("version") int version,
        @JsonProperty("item_id") String itemId,
        @JsonProperty("store_id_or_zone") String storeIdOrZone,
        @JsonProperty("price") BigDecimal price,
        @JsonProperty("currency") String currency,
        @JsonProperty("effective_start") LocalDate effectiveStart,
        @JsonProperty("effective_end") LocalDate effectiveEnd,
        @JsonProperty("change_type") String changeType,
        @JsonProperty("validation_status") RecordStatus validationStatus,
        @JsonProperty("set_aside_reason") String setAsideReason,
        @JsonProperty("extras") Map<String, Object> extras) {
}
