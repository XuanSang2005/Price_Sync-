package price_sync.processing;

import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.stereotype.Component;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import price_sync.domain.ChangeType;
import price_sync.domain.MappingRule;
import price_sync.domain.PriceRecord;

// Mapper ĐỌC SỔ (mapping_rule) thay vì hardcode: mỗi record → chọn bộ luật theo record_type
// (delete→FDELE, còn lại→FDETL) → lặp luật theo position → mỗi luật dựng một cột.
// Mapper vẫn là hàm THUẦN (không tự query DB): danh sách luật do BatchProcessor nạp rồi truyền vào,
// nhờ vậy test chỉ cần new Mapper() + tự dựng luật.
@Component
public class Mapper {
    private final ObjectMapper objectMapper = new ObjectMapper();

    public Optional<MntRow> map(PriceRecord record, LocalDate businessDate, List<MappingRule> rules) {
        ChangeType changeType = ChangeType.valueOf(record.getChangeType().toUpperCase());
        MntRecordType recordType = (changeType == ChangeType.DELETE) ? MntRecordType.FDELE : MntRecordType.FDETL;

        // Gom mọi field của record về một túi tên→giá-trị (đã format sẵn), khớp tên json_field trong sổ.
        Map<String, String> fields = buildFields(record, businessDate);

        // Lấy đúng bộ luật của record_type này, sắp theo thứ tự cột.
        List<MappingRule> applicable = rules.stream()
                .filter(rule -> rule.getRecordType().equals(recordType.name()))
                .sorted(Comparator.comparingInt(MappingRule::getPosition))
                .toList();

        List<String> columns = new ArrayList<>();
        for (MappingRule rule : applicable) {
            Optional<String> value = applyRule(rule, fields);
            if (value.isEmpty()) {
                return Optional.empty(); // một luật báo "không map được" → cả record unmappable
            }
            columns.add(value.get());
        }
        return Optional.of(new MntRow(recordType, columns));
    }

    // Túi field: fixed getters (đã format theo kiểu MNT) + mọi field động trong extras.
    private Map<String, String> buildFields(PriceRecord record, LocalDate businessDate) {
        Map<String, String> fields = new HashMap<>();
        fields.put("item_id", record.getItemId());
        fields.put("store_id_or_zone", record.getStoreIdOrZone());
        if (record.getPrice() != null) {
            fields.put("price", record.getPrice().setScale(0, RoundingMode.HALF_UP).toPlainString()); // VND scale 0
        }
        if (record.getCurrency() != null) {
            fields.put("currency", record.getCurrency()); // null → để luật DEFAULT điền VND
        }
        LocalDate effStart = record.getEffectiveStart() != null ? record.getEffectiveStart()
                : businessDate.plusDays(1); // mặc định hiệu lực ngày mai (giữ nguyên hành vi cũ)
        fields.put("effective_start", effStart.toString());
        fields.put("effective_end", record.getEffectiveEnd() != null ? record.getEffectiveEnd().toString() : "");
        fields.put("change_type", record.getChangeType());
        if (record.getExtras() != null) {
            for (Map.Entry<String, Object> e : record.getExtras().entrySet()) {
                fields.put(e.getKey(), e.getValue() != null ? String.valueOf(e.getValue()) : "");
            }
        }
        return fields;
    }

    // Áp một luật → giá trị một cột. Optional.empty() = không map được (đẩy cả record thành unmappable).
    private Optional<String> applyRule(MappingRule rule, Map<String, String> fields) {
        String raw = fields.get(rule.getJsonField());
        switch (rule.getRuleType()) {
            case "DIRECT":
                // lấy thẳng; field vắng mặt (vd extras không có) → cột rỗng
                return Optional.of(raw != null ? raw : "");
            case "DEFAULT":
                // thiếu → điền hằng số rule_value
                if (raw != null && !raw.isEmpty()) {
                    return Optional.of(raw);
                }
                return Optional.of(rule.getRuleValue() != null ? rule.getRuleValue() : "");
            case "VALUE_MAP": {
                // tra bảng theo prefix (STORE_001 → STORE); không có trong bảng → unmappable
                if (raw == null) {
                    return Optional.empty();
                }
                String prefix = raw.split("_", 2)[0].toUpperCase();
                String mapped = parseMap(rule.getRuleValue()).get(prefix);
                return mapped != null ? Optional.of(mapped) : Optional.empty();
            }
            case "SPLIT": {
                // tách phần sau dấu "_" (STORE_001 → 001)
                if (raw == null) {
                    return Optional.empty();
                }
                String[] parts = raw.split("_", 2);
                return Optional.of(parts.length > 1 ? parts[1] : "");
            }
            default:
                return Optional.of(raw != null ? raw : "");
        }
    }

    // Parse chuỗi JSON của VALUE_MAP thành Map. Hỏng/null → map rỗng (→ VALUE_MAP thành unmappable).
    private Map<String, String> parseMap(String json) {
        if (json == null) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, String>>() {
            });
        } catch (JsonProcessingException e) {
            return Map.of();
        }
    }
}
