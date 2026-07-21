package price_sync.processing;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

import price_sync.domain.mapping.MappingRule;
import price_sync.domain.record.PriceRecord;

public class ValidatorTest {
    private final Validator validator = new Validator();

    @Test
    void record_hop_le_thi_khong_bi_set_aside() {
        PriceRecord record = new PriceRecord(1L, "c1", 1, "SKU1", "STORE_001",
                new BigDecimal("100"), "VND", LocalDate.of(2026, 7, 17), null, "new", null);
        Optional<String> reason = validator.validate(record, List.of());

        assertThat(reason).isEmpty();
    }

    @Test
    void gia_am_bi_set_aside() {
        PriceRecord record = new PriceRecord(1L, "c1", 1, "SKU1", "STORE_001",
                new BigDecimal("-999"), "VND", LocalDate.of(2026, 7, 17), null, "new", null);
        Optional<String> reason = validator.validate(record, List.of());

        assertThat(reason).contains(("INVALID_PRICE"));

    }

    @Test
    void delete_khong_can_gi() {
        PriceRecord record = new PriceRecord(null, null, 0, null, null, null, null, null, null, "delete", null);

        Optional<String> reason = validator.validate(record, List.of());

        assertThat(reason).isEmpty();
    }

    @Test
    void sai_change_type() {
        PriceRecord record = new PriceRecord(null, null, 0, null, null, null, null, null, null, "sai", null);

        Optional<String> reason = validator.validate(record, List.of());

        assertThat(reason).contains("INVALID_CHANGE_TYPE");
    }

    @Test
    void sai_currency() {
        PriceRecord record = new PriceRecord(1L, "c1", 1, "SKU1", "STORE_001",
                new BigDecimal("100"), "VNDD", LocalDate.of(2026, 7, 17), null, "new", null);
        Optional<String> reason = validator.validate(record, List.of());

        assertThat(reason).contains("INVALID_CURRENCY");
    }

    @Test 
    void sai_khoang_ngay(){
       PriceRecord record = new PriceRecord(1L, "c1", 1, "SKU1", "STORE_001",
                new BigDecimal("100"), "VND", LocalDate.of(2026, 9, 17), LocalDate.of(2026, 8, 17), "new", null);
                        Optional<String> reason = validator.validate(record, List.of());

        assertThat(reason).contains("INVALID_DATE_RANGE");
     }

    @Test
    void field_dong_sai_kieu_bi_set_aside() {
        // promo_pct khai kiểu NUMBER, record gửi "abc" → set aside INVALID_PROMO_PCT
        PriceRecord record = new PriceRecord(1L, "c1", 1, "SKU1", "STORE_001",
                new BigDecimal("100"), "VND", LocalDate.of(2026, 7, 17), null, "new",
                Map.of("promo_pct", "abc"));
        List<MappingRule> rules = List.of(
                new MappingRule("FDETL", 8, "promo_pct", "PROMO_PCT", "DIRECT", null, "NUMBER", false));
        Optional<String> reason = validator.validate(record, rules);

        assertThat(reason).contains("INVALID_PROMO_PCT");
    }

    @Test
    void field_dong_bat_buoc_ma_thieu_bi_set_aside() {
        // gift_sku khai required nhưng record không kèm → MISSING_GIFT_SKU
        PriceRecord record = new PriceRecord(1L, "c1", 1, "SKU1", "STORE_001",
                new BigDecimal("100"), "VND", LocalDate.of(2026, 7, 17), null, "new", null);
        List<MappingRule> rules = List.of(
                new MappingRule("FDETL", 8, "gift_sku", "GIFT_SKU", "DIRECT", null, "STRING", true));
        Optional<String> reason = validator.validate(record, rules);

        assertThat(reason).contains("MISSING_GIFT_SKU");
    }
}
