package price_sync.processing;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;

import price_sync.domain.BatchLogRepository;
import price_sync.domain.BatchStatus;
import price_sync.domain.ConfigRepository;
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

    private final BatchProcessor processor = new BatchProcessor(priceRecordRepository, new Validator(),
            priceBatchRepository, new Mapper(), builder, writer, batchLogRepository, configRepository);

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
                new BigDecimal("100"), "VND", null, null, "new");
    }

    private PriceRecord recordGiaAm() {
        return new PriceRecord(1L, "c", 1, "SKU", "STORE_1",
                new BigDecimal("-1"), "VND", null, null, "new");
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

    private PriceRecord recordUnmappable() {
        return new PriceRecord(1L, "c", 1, "SKU", "XYC_1",
                new BigDecimal("-1"), "VND", null, null, "new");
    }

    @Test
    public void mapBatch_neu_co_version_cao_hon_thi_Supersede() throws IOException{
        PriceBatch priceBatch = new PriceBatch("aaa", 2, OffsetDateTime.now());
        when(priceBatchRepository.findById(1L)).thenReturn(Optional.of(priceBatch));

        PriceRecord cu  = new PriceRecord(1L, "chgA", 1, "SKU1", "STORE_001",
                new BigDecimal("100"), "VND", null, null, "new");
        PriceRecord moi = new PriceRecord(1L, "chgA", 2, "SKU1", "STORE_001",
                new BigDecimal("100"), "VND", null, null, "new");
        when(priceRecordRepository.findByBatchIdAndValidationStatus(1L, RecordStatus.VALID))
                .thenReturn(List.of(cu, moi));


        processor.mapBatch(1L);
        assertThat(cu.getValidationStatus()).isEqualTo(RecordStatus.SUPERSEDED);
        assertThat(priceBatch.getStatus()).isEqualTo(BatchStatus.WRITTEN);
    }

    @Test
    public void claimNext_neu_ko_tim_thay_thi_Empty(){
        when(priceBatchRepository.findNextToClaim()).thenReturn(Optional.empty());
        Optional<PriceBatch> batch = processor.claimNext(null);
        
        assertThat(batch).isEmpty();
    }

    @Test 
    public void claimNext_neu_tim_thay_thi_tra_ve_batch(){
        PriceBatch priceBatch = new PriceBatch("b1", 1, OffsetDateTime.now());

        when(priceBatchRepository.findNextToClaim()).thenReturn(Optional.of(priceBatch));
        
        Optional<PriceBatch> batch = processor.claimNext("owner-1");
        
        assertThat(batch).isPresent();
        assertThat(priceBatch.getStatus()).isEqualTo(BatchStatus.PROCESSING);
    }

}
