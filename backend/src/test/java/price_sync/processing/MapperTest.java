package price_sync.processing;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import org.junit.jupiter.api.Test;

import price_sync.domain.PriceRecord;

public class MapperTest {
    private final Mapper mapper = new Mapper();
    private final LocalDate bussiLocalDate = LocalDate.of(2026, 7, 15);

    @Test
    public void new_store_ra_FDETL() {
        PriceRecord record = new PriceRecord(1L, "c1", 1, "SKU1", "STORE_001",
                new BigDecimal("100"), null, LocalDate.of(2026, 07, 17), null, "new");
        Optional<MntRow> result = mapper.map(record, bussiLocalDate);
        assertThat(result).isPresent();
        MntRow row = result.get();
        assertThat(row.recordType()).isEqualTo(MntRecordType.FDETL);
        assertThat(row.columns()).containsExactly("SKU1", "S", "001", "100", "VND", "2026-07-17", "");
    }

    @Test
    public void delete_ra_FDELE() {
        PriceRecord record = new PriceRecord(1L, "c1", 1, "SKU1", "STORE_001",
                null, null, null, null, "delete");
        Optional<MntRow> result = mapper.map(record, bussiLocalDate);
        assertThat(result).isPresent();
        MntRow row = result.get();
        assertThat(row.recordType()).isEqualTo(MntRecordType.FDELE);
        assertThat(row.columns()).containsExactly("SKU1", "S", "001");
    }

    @Test
    public void zone_ra_Z() {
        PriceRecord record = new PriceRecord(1L, "c1", 1, "SKU1", "ZONE_NORTH",
                null, null, null, null, "delete");
        Optional<MntRow> result = mapper.map(record, bussiLocalDate);
        assertThat(result).isPresent();
        MntRow row = result.get();
        assertThat(row.recordType()).isEqualTo(MntRecordType.FDELE);
        assertThat(row.columns()).contains("Z", "NORTH");
    }

    @Test
    public void khong_map_ra_duoc_empty() {
        PriceRecord record = new PriceRecord(1L, "c1", 1, "SKU1", "XYZ_001",
                null, null, null, null, "delete");
        Optional<MntRow> result = mapper.map(record, bussiLocalDate);
        assertThat(result).isEmpty();
    }

    @Test
    public void currency_mac_dinh_VND() {
        PriceRecord record = new PriceRecord(1L, "c1", 1, "SKU1", "ZONE_NORTH",
                BigDecimal.valueOf(100), null, null, null, "new");
        Optional<MntRow> result = mapper.map(record, bussiLocalDate);
        assertThat(result).isPresent();
        MntRow row = result.get();
        assertThat(row.recordType()).isEqualTo(MntRecordType.FDETL);
        assertThat(row.columns()).contains("VND");
    }

}
