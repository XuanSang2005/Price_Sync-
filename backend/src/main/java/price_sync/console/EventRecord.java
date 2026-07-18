package price_sync.console;

import com.fasterxml.jackson.annotation.JsonProperty;

import price_sync.domain.RecordStatus;

public record EventRecord(
        @JsonProperty("change_id") String changeId,
        @JsonProperty("item_id") String itemId,
        @JsonProperty("store_id_or_zone") String storeIdOrZone,
        @JsonProperty("validation_status") RecordStatus validationStatus,
        @JsonProperty("set_aside_reason") String setAsideReason) {
}
