package price_sync.processing.mapper;

import java.lang.reflect.Method;
import java.math.BigDecimal;
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

import price_sync.domain.record.ChangeType;
import price_sync.domain.mapping.MappingRule;
import price_sync.domain.record.PriceRecord;

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

    // Túi field: tên json_field (snake_case) → giá trị đã format sẵn theo kiểu MNT.
    // DYNAMIC bằng REFLECTION: thay vì liệt kê tay từng getter, ta duyệt MỌI getter của entity
    // rồi đổi tên getter → snake_case (getItemId → item_id) và tự đọc giá trị. Nhờ vậy THÊM một cột
    // cố định vào PriceRecord là map được NGAY qua mapping_rule, không phải sửa Mapper.
    private Map<String, String> buildFields(PriceRecord record, LocalDate businessDate) {
        Map<String, String> fields = new HashMap<>();

        for (Method getter : PriceRecord.class.getMethods()) {
            if (getter.getParameterCount() != 0) {
                continue; // getter thật không có tham số
            }
            String name = getter.getName();
            if (!name.startsWith("get") || name.equals("getClass") || name.equals("getExtras")) {
                continue; // bỏ getClass (nhiễu) và extras (xử lý riêng bên dưới, kiểu Map)
            }
            if (getter.getReturnType() == void.class) {
                continue;
            }
            try {
                fields.put(toSnakeCase(name.substring(3)), formatValue(getter.invoke(record)));
            } catch (ReflectiveOperationException e) {
                // getter lỗi thì bỏ qua field đó — không làm hỏng cả record
            }
        }

        // Default nghiệp vụ ĐẶC THÙ (reflection không tổng quát hoá được): hiệu lực mặc định = ngày mai.
        if (record.getEffectiveStart() == null) {
            fields.put("effective_start", businessDate.plusDays(1).toString());
        }

        // Field ĐỘNG (JSONB extras) — do HQ khai thêm qua mapping_rule
        if (record.getExtras() != null) {
            for (Map.Entry<String, Object> e : record.getExtras().entrySet()) {
                fields.put(e.getKey(), e.getValue() != null ? String.valueOf(e.getValue()) : "");
            }
        }
        return fields;
    }

    // Format giá trị theo KIỂU (không cần biết tên field): tiền → làm tròn scale 0 (VND), ngày → ISO,
    // null → chuỗi rỗng (để luật DEFAULT/DIRECT tự xử), còn lại → String.valueOf.
    private String formatValue(Object value) {
        if (value == null) {
            return "";
        }
        if (value instanceof BigDecimal money) {
            return money.setScale(0, RoundingMode.HALF_UP).toPlainString();
        }
        if (value instanceof LocalDate date) {
            return date.toString();
        }
        return String.valueOf(value);
    }

    // "ItemId" → "item_id", "StoreIdOrZone" → "store_id_or_zone" (chèn "_" trước mỗi chữ hoa, hạ chữ thường).
    private String toSnakeCase(String camel) {
        StringBuilder out = new StringBuilder();
        for (int i = 0; i < camel.length(); i++) {
            char c = camel.charAt(i);
            if (Character.isUpperCase(c)) {
                if (i > 0) {
                    out.append('_');
                }
                out.append(Character.toLowerCase(c));
            } else {
                out.append(c);
            }
        }
        return out.toString();
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
