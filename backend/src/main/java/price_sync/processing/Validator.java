package price_sync.processing;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Component;

import price_sync.domain.mapping.MappingRule;
import price_sync.domain.record.ChangeType;
import price_sync.domain.record.PriceRecord;

@Component
public class Validator {

    // Validate NGỮ NGHĨA field CHUẨN (điều khiển giá thật) + kiểm field ĐỘNG BẮT BUỘC có mặt (required).
    // KHÔNG kiểm KIỂU field động nữa (data_type đã bỏ) — hệ không hiểu nghĩa, HQ tự chịu nội dung;
    // toàn vẹn file lo bằng escape (RFC-4180) ở builder chứ không phải shape-check ở đây.
    public Optional<String> validate(PriceRecord record, List<MappingRule> rules) {
        try {
            ChangeType.valueOf(record.getChangeType().toUpperCase());
        } catch (IllegalArgumentException e) {
            return Optional.of("INVALID_CHANGE_TYPE");
        }

        if (!ChangeType.valueOf(record.getChangeType().toUpperCase()).equals(ChangeType.DELETE)) {
            if (record.getPrice() == null || record.getPrice().compareTo(BigDecimal.ZERO) <= 0) {
                return Optional.of("INVALID_PRICE");
            }
        }

        if (record.getCurrency() != null) {
            if (record.getCurrency().length() != 3) {
                return Optional.of("INVALID_CURRENCY");
            }
        }

        if (record.getEffectiveEnd() != null && record.getEffectiveStart() != null) {
            if (!record.getEffectiveStart().isBefore(record.getEffectiveEnd())) {
                return Optional.of("INVALID_DATE_RANGE");
            }
        }

        return validateRequired(record, rules);
    }

    // Field ĐỘNG khai required mà record không kèm (hoặc rỗng) → set aside MISSING_<FIELD>.
    private Optional<String> validateRequired(PriceRecord record, List<MappingRule> rules) {
        boolean isDelete = ChangeType.valueOf(record.getChangeType().toUpperCase()) == ChangeType.DELETE;
        String recordType = isDelete ? "FDELE" : "FDETL";
        for (MappingRule rule : rules) {
            if (!rule.getRecordType().equals(recordType) || !rule.isRequired()) {
                continue;
            }
            Object raw = record.getExtras() != null ? record.getExtras().get(rule.getJsonField()) : null;
            if (raw == null || raw.toString().isEmpty()) {
                return Optional.of("MISSING_" + rule.getJsonField().toUpperCase());
            }
        }
        return Optional.empty();
    }
}
