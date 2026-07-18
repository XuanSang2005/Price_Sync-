package price_sync.processing;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

import price_sync.domain.PriceRecord;

public class ValidatorTest {
    private final Validator validator = new Validator();

    @Test
    void record_hop_le_thi_khong_bi_set_aside() {
        PriceRecord record = new PriceRecord(1L, "c1", 1, "SKU1", "STORE_001",
                new BigDecimal("100"), "VND", LocalDate.of(2026, 7, 17), null, "new");
        Optional<String> reason = validator.validate(record);

        assertThat(reason).isEmpty();
    }

    @Test
    void gia_am_bi_set_aside() {
        PriceRecord record = new PriceRecord(1L, "c1", 1, "SKU1", "STORE_001",
                new BigDecimal("-999"), "VND", LocalDate.of(2026, 7, 17), null, "new");
        Optional<String> reason = validator.validate(record);

        assertThat(reason).contains(("INVALID_PRICE"));

    }

    @Test
    void delete_khong_can_gi() {
        PriceRecord record = new PriceRecord(null, null, 0, null, null, null, null, null, null, "delete");

        Optional<String> reason = validator.validate(record);

        assertThat(reason).isEmpty();
    }

    @Test
    void sai_change_type() {
        PriceRecord record = new PriceRecord(null, null, 0, null, null, null, null, null, null, "sai");

        Optional<String> reason = validator.validate(record);

        assertThat(reason).contains("INVALID_CHANGE_TYPE");
    }

    @Test
    void sai_currency() {
        PriceRecord record = new PriceRecord(1L, "c1", 1, "SKU1", "STORE_001",
                new BigDecimal("100"), "VNDD", LocalDate.of(2026, 7, 17), null, "new");
        Optional<String> reason = validator.validate(record);

        assertThat(reason).contains("INVALID_CURRENCY");
    }

    @Test 
    void sai_khoang_ngay(){
       PriceRecord record = new PriceRecord(1L, "c1", 1, "SKU1", "STORE_001",
                new BigDecimal("100"), "VND", LocalDate.of(2026, 9, 17), LocalDate.of(2026, 8, 17), "new");
                        Optional<String> reason = validator.validate(record);

        assertThat(reason).contains("INVALID_DATE_RANGE");
     }
}
