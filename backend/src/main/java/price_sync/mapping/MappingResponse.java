package price_sync.mapping;

import com.fasterxml.jackson.annotation.JsonProperty;

// DTO trả về cho UI (snake_case khớp JSON; kèm id để UI xoá đúng dòng).
public record MappingResponse(
        Long id,
        @JsonProperty("record_type") String recordType,
        int position,
        @JsonProperty("json_field") String jsonField,
        @JsonProperty("mnt_column") String mntColumn,
        @JsonProperty("rule_type") String ruleType,
        @JsonProperty("rule_value") String ruleValue,
        @JsonProperty("data_type") String dataType,
        boolean required) {
}
