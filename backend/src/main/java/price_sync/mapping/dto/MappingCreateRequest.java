package price_sync.mapping.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

// DTO khai luật mới từ UI. rule_value nullable (DIRECT để trống).
public record MappingCreateRequest(
        @JsonProperty("record_type") String recordType,
        int position,
        @JsonProperty("json_field") String jsonField,
        @JsonProperty("mnt_column") String mntColumn,
        @JsonProperty("rule_type") String ruleType,
        @JsonProperty("rule_value") String ruleValue,
        boolean required) {
}
