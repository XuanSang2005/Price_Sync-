package price_sync.processing;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Component;

import price_sync.domain.record.ChangeType;
import price_sync.domain.mapping.MappingRule;
import price_sync.domain.record.PriceRecord;

@Component
public class Validator {

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
                continue; 
            }
            if (rule.getDataType() == null) {
                continue; 
            }
            String field = rule.getJsonField();
            Object raw = record.getExtras() != null ? record.getExtras().get(field) : null;

            if (rule.isRequired() && (raw == null || raw.toString().isEmpty())) {
                return Optional.of("MISSING_" + field.toUpperCase());
            }
            if (raw == null) {
                continue; 
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
                    break; 
            }
        }
        return Optional.empty();
    }
}
