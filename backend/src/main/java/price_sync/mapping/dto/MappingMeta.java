package price_sync.mapping.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

// Metadata cho UI mapping — để frontend KHÔNG hardcode danh sách nào:
// source_fields = field cố định + field động đã khai trong sổ;
// record_types / rule_types là hằng single-source ở backend (nơi có logic Mapper).
public record MappingMeta(
        @JsonProperty("source_fields") List<String> sourceFields,
        @JsonProperty("record_types") List<String> recordTypes,
        @JsonProperty("rule_types") List<String> ruleTypes) {
}
