package price_sync.processing;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Component;

import price_sync.domain.ChangeType;
import price_sync.domain.MappingRule;
import price_sync.domain.PriceRecord;

@Component
public class Validator {

    // 4 luật FR-03 CỨNG (field cố định, code hiểu nghĩa) + validate ĐỘNG theo sổ (field khai thêm).
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

        // ==== Validate ĐỘNG: chỉ kiểm HÌNH DẠNG field khai thêm (không semantic được) ====
        Optional<String> dynamicReason = validateDynamic(record, rules);
        if (dynamicReason.isPresent()) {
            return dynamicReason;
        }

        return Optional.empty();
    }

    private Optional<String> validateDynamic(PriceRecord record, List<MappingRule> rules) {
        boolean isDelete = ChangeType.valueOf(record.getChangeType().toUpperCase()) == ChangeType.DELETE;
        String recordType = isDelete ? "FDELE" : "FDETL";

        for (MappingRule rule : rules) {
            if (!rule.getRecordType().equals(recordType)) {
                continue; // luật của kiểu dòng khác → bỏ qua
            }
            if (rule.getDataType() == null) {
                continue; // field cố định (data_type null) → 4 luật cứng lo, không kiểm ở đây
            }
            String field = rule.getJsonField();
            Object raw = record.getExtras() != null ? record.getExtras().get(field) : null;

            if (rule.isRequired() && (raw == null || raw.toString().isEmpty())) {
                return Optional.of("MISSING_" + field.toUpperCase());
            }
            if (raw == null) {
                continue; // không bắt buộc + vắng → cho qua
            }
            String value = raw.toString();
            switch (rule.getDataType()) {
                case "NUMBER":
                    try {
                        Double.parseDouble(value);
                    } catch (NumberFormatException e) {
                        return Optional.of("INVALID_" + field.toUpperCase());
                    }
                    break;
                case "DATE":
                    try {
                        LocalDate.parse(value);
                    } catch (DateTimeParseException e) {
                        return Optional.of("INVALID_" + field.toUpperCase());
                    }
                    break;
                default:
                    break; // STRING → không kiểm hình dạng
            }
        }
        return Optional.empty();
    }
}
