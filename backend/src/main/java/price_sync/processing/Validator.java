package price_sync.processing;

import java.math.BigDecimal;
import java.util.Optional;

import org.springframework.stereotype.Component;

import price_sync.domain.ChangeType;
import price_sync.domain.PriceRecord;

@Component
public class Validator {
    public Optional<String> validate(PriceRecord record) {
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
        return Optional.empty();

    }
}
