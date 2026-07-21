package price_sync.processing;

import price_sync.processing.mapper.Mapper;
import price_sync.processing.mapper.MntRow;
import price_sync.processing.mapper.MntRecordType;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;

import price_sync.domain.mapping.MappingRule;
import price_sync.domain.record.PriceRecord;

public class MapperTest {
    private final Mapper mapper = new Mapper();
    private final LocalDate bussiLocalDate = LocalDate.of(2026, 7, 15);

    // Bộ luật CHUẨN khớp seed V14+V15 (FDETL 7 cột, FDELE 3 cột) — Mapper giờ đọc luật, test tự cấp.
    private static final String LOC_MAP = "{\"STORE\":\"S\",\"ZONE\":\"Z\"}";
    private final List<MappingRule> rules = List.of(
            new MappingRule("FDETL", 1, "item_id", "ITEM", "DIRECT", null),
            new MappingRule("FDETL", 2, "store_id_or_zone", "LOC_TYPE", "VALUE_MAP", LOC_MAP),
            new MappingRule("FDETL", 3, "store_id_or_zone", "LOCATION", "SPLIT", null),
            new MappingRule("FDETL", 4, "price", "PRICE", "DIRECT", null),
            new MappingRule("FDETL", 5, "currency", "CURRENCY", "DEFAULT", "VND"),
            new MappingRule("FDETL", 6, "effective_start", "EFF_START", "DIRECT", null),
            new MappingRule("FDETL", 7, "effective_end", "EFF_END", "DIRECT", null),
            new MappingRule("FDELE", 1, "item_id", "ITEM", "DIRECT", null),
            new MappingRule("FDELE", 2, "store_id_or_zone", "LOC_TYPE", "VALUE_MAP", LOC_MAP),
            new MappingRule("FDELE", 3, "store_id_or_zone", "LOCATION", "SPLIT", null));

    @Test
    public void new_store_ra_FDETL() {
        PriceRecord record = new PriceRecord(1L, "c1", 1, "SKU1", "STORE_001",
                new BigDecimal("100"), null, LocalDate.of(2026, 07, 17), null, "new", null);
        Optional<MntRow> result = mapper.map(record, bussiLocalDate, rules);
        assertThat(result).isPresent();
        MntRow row = result.get();
        assertThat(row.recordType()).isEqualTo(MntRecordType.FDETL);
        assertThat(row.columns()).containsExactly("SKU1", "S", "001", "100", "VND", "2026-07-17", "");
    }

    @Test
    public void delete_ra_FDELE() {
        PriceRecord record = new PriceRecord(1L, "c1", 1, "SKU1", "STORE_001",
                null, null, null, null, "delete", null);
        Optional<MntRow> result = mapper.map(record, bussiLocalDate, rules);
        assertThat(result).isPresent();
        MntRow row = result.get();
        assertThat(row.recordType()).isEqualTo(MntRecordType.FDELE);
        assertThat(row.columns()).containsExactly("SKU1", "S", "001");
    }

    @Test
    public void zone_ra_Z() {
        PriceRecord record = new PriceRecord(1L, "c1", 1, "SKU1", "ZONE_NORTH",
                null, null, null, null, "delete", null);
        Optional<MntRow> result = mapper.map(record, bussiLocalDate, rules);
        assertThat(result).isPresent();
        MntRow row = result.get();
        assertThat(row.recordType()).isEqualTo(MntRecordType.FDELE);
        assertThat(row.columns()).contains("Z", "NORTH");
    }

    @Test
    public void khong_map_ra_duoc_empty() {
        PriceRecord record = new PriceRecord(1L, "c1", 1, "SKU1", "XYZ_001",
                null, null, null, null, "delete", null);
        Optional<MntRow> result = mapper.map(record, bussiLocalDate, rules);
        assertThat(result).isEmpty();
    }

    @Test
    public void currency_mac_dinh_VND() {
        PriceRecord record = new PriceRecord(1L, "c1", 1, "SKU1", "ZONE_NORTH",
                BigDecimal.valueOf(100), null, null, null, "new", null);
        Optional<MntRow> result = mapper.map(record, bussiLocalDate, rules);
        assertThat(result).isPresent();
        MntRow row = result.get();
        assertThat(row.recordType()).isEqualTo(MntRecordType.FDETL);
        assertThat(row.columns()).contains("VND");
    }

}
