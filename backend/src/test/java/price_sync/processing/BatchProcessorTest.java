package price_sync.processing;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Path;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import price_sync.domain.BatchLogRepository;
import price_sync.domain.BatchStatus;
import price_sync.domain.ConfigRepository;
import price_sync.domain.MappingRule;
import price_sync.domain.MappingRuleRepository;
import price_sync.domain.PriceBatch;
import price_sync.domain.PriceBatchRepository;
import price_sync.domain.PriceRecord;
import price_sync.domain.PriceRecordRepository;
import price_sync.domain.RecordStatus;

public class BatchProcessorTest {

    private final PriceBatchRepository priceBatchRepository = mock(PriceBatchRepository.class);
    private final PriceRecordRepository priceRecordRepository = mock(PriceRecordRepository.class);
    private final BatchLogRepository batchLogRepository = mock(BatchLogRepository.class);
    private final PayloadBuilder builder = mock(PayloadBuilder.class);
    private final OutputWriter writer = mock(OutputWriter.class);
    private final ConfigRepository configRepository = mock(ConfigRepository.class);
    private final MappingRuleRepository mappingRuleRepository = mock(MappingRuleRepository.class);

    private final BatchProcessor processor = new BatchProcessor(priceRecordRepository, new Validator(),
            priceBatchRepository, new Mapper(), builder, writer, batchLogRepository, configRepository,
            mappingRuleRepository);

    // Bộ luật chuẩn (FDETL 7 cột + FDELE 3 cột) — Mapper thật cần để dựng cột.
    private static final String LOC_MAP = "{\"STORE\":\"S\",\"ZONE\":\"Z\"}";
    private static final List<MappingRule> STANDARD_RULES = List.of(
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

    @BeforeEach
    void stubBuilder() throws IOException{
        when(builder.build(any(), any())).thenReturn(Path.of("dummy.mnt"));
        when(mappingRuleRepository.findAll()).thenReturn(STANDARD_RULES);
    }

    @Test
    public void qua_20_pt_bi_setAside_thi_fail() {
        PriceBatch priceBatch = new PriceBatch("b1", 1, OffsetDateTime.now());
        when(priceBatchRepository.findById(1L)).thenReturn(Optional.of(priceBatch));

        List<PriceRecord> records = List.of(recordHopLe(), recordHopLe(), recordGiaAm(), recordGiaAm());
        when(priceRecordRepository.findByBatchId(1L)).thenReturn(records);

        boolean pass = processor.validateBatch(1L);

        assertThat(pass).isFalse();
        assertThat(priceBatch.getStatus()).isEqualTo(BatchStatus.FAILED);
    }

    @Test
    public void dung_20_pt_bi_setAside_van_pass() {
        PriceBatch priceBatch = new PriceBatch("aaa", 2, OffsetDateTime.now());
        when(priceBatchRepository.findById(1L)).thenReturn(Optional.of(priceBatch));

        List<PriceRecord> records = List.of(recordGiaAm(), recordHopLe(), recordHopLe(), recordHopLe(), recordHopLe());
        when(priceRecordRepository.findByBatchId(1L)).thenReturn(records);

        boolean pass = processor.validateBatch(1L);

        assertThat(!pass).isFalse();
        assertThat(priceBatch.getStatus()).isNotEqualTo(BatchStatus.FAILED);

    }

    private PriceRecord recordHopLe() {
        return new PriceRecord(1L, "c", 1, "SKU", "STORE_1",
                new BigDecimal("100"), "VND", null, null, "new", null);
    }

    private PriceRecord recordGiaAm() {
        return new PriceRecord(1L, "c", 1, "SKU", "STORE_1",
                new BigDecimal("-1"), "VND", null, null, "new", null);
    }

    @Test
    public void mapBatch_het_map_dc_thi_WRITTEN() throws IOException {
        PriceBatch priceBatch = new PriceBatch("aaa", 2, OffsetDateTime.now());
        when(priceBatchRepository.findById(1L)).thenReturn(Optional.of(priceBatch));

        List<PriceRecord> records = List.of(recordHopLe(), recordHopLe(), recordHopLe(), recordHopLe(), recordHopLe());
        when(priceRecordRepository.findByBatchIdAndValidationStatus(1L, RecordStatus.VALID)).thenReturn(records);

        processor.mapBatch(1L);
        assertThat(priceBatch.getStatus()).isEqualTo(BatchStatus.WRITTEN);
    }

    @Test
    public void mapBatch_neu_co_setAside_thi_Partial() throws IOException {
        PriceBatch priceBatch = new PriceBatch("aaa", 2, OffsetDateTime.now());
        when(priceBatchRepository.findById(1L)).thenReturn(Optional.of(priceBatch));

        List<PriceRecord> records = List.of(recordHopLe(), recordHopLe(), recordHopLe(), recordUnmappable(),
                recordHopLe());
        when(priceRecordRepository.findByBatchIdAndValidationStatus(1L, RecordStatus.VALID)).thenReturn(records);

        processor.mapBatch(1L);
        assertThat(priceBatch.getStatus()).isEqualTo(BatchStatus.PARTIAL);
    }

    @Test
    public void mapBatch_validate_setAside_thi_Partial() throws IOException {
        PriceBatch priceBatch = new PriceBatch("aaa", 2, OffsetDateTime.now());
        when(priceBatchRepository.findById(1L)).thenReturn(Optional.of(priceBatch));
        // các record VALID đều map được (không set-aside lúc map)
        when(priceRecordRepository.findByBatchIdAndValidationStatus(1L, RecordStatus.VALID))
                .thenReturn(List.of(recordHopLe(), recordHopLe()));
        // nhưng batch CÓ record bị gạt lúc VALIDATE (dưới ngưỡng abort) → phải PARTIAL, không WRITTEN
        when(priceRecordRepository.existsByBatchIdAndValidationStatus(1L, RecordStatus.SET_ASIDE)).thenReturn(true);

        processor.mapBatch(1L);
        assertThat(priceBatch.getStatus()).isEqualTo(BatchStatus.PARTIAL);
    }

    private PriceRecord recordUnmappable() {
        return new PriceRecord(1L, "c", 1, "SKU", "XYC_1",
                new BigDecimal("-1"), "VND", null, null, "new", null);
    }

    @Test
    public void mapBatch_neu_co_version_cao_hon_thi_Supersede() throws IOException {
        PriceBatch priceBatch = new PriceBatch("aaa", 2, OffsetDateTime.now());
        when(priceBatchRepository.findById(1L)).thenReturn(Optional.of(priceBatch));

        PriceRecord cu = new PriceRecord(1L, "chgA", 1, "SKU1", "STORE_001",
                new BigDecimal("100"), "VND", null, null, "new", null);
        PriceRecord moi = new PriceRecord(1L, "chgA", 2, "SKU1", "STORE_001",
                new BigDecimal("100"), "VND", null, null, "new", null);
        when(priceRecordRepository.findByBatchIdAndValidationStatus(1L, RecordStatus.VALID))
                .thenReturn(List.of(cu, moi));

        processor.mapBatch(1L);
        assertThat(cu.getValidationStatus()).isEqualTo(RecordStatus.SUPERSEDED);
        assertThat(priceBatch.getStatus()).isEqualTo(BatchStatus.WRITTEN);
    }

    @Test
    public void claimNext_neu_ko_tim_thay_thi_Empty() {
        when(priceBatchRepository.findNextToClaim()).thenReturn(Optional.empty());
        Optional<PriceBatch> batch = processor.claimNext(null);

        assertThat(batch).isEmpty();
    }

    @Test
    public void claimNext_neu_tim_thay_thi_tra_ve_batch() {
        PriceBatch priceBatch = new PriceBatch("b1", 1, OffsetDateTime.now());

        when(priceBatchRepository.findNextToClaim()).thenReturn(Optional.of(priceBatch));

        Optional<PriceBatch> batch = processor.claimNext("owner-1");

        assertThat(batch).isPresent();
        assertThat(priceBatch.getStatus()).isEqualTo(BatchStatus.PROCESSING);
    }

}
