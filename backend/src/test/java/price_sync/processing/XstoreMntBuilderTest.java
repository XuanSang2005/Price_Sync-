package price_sync.processing;

import price_sync.processing.mapper.MntRow;
import price_sync.processing.mapper.MntRecordType;
import price_sync.processing.writer.XstoreMntBuilder;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.Test;


public class XstoreMntBuilderTest {
    private final XstoreMntBuilder builder = new XstoreMntBuilder();

    @Test
    void build_ra_dung_format() throws IOException {
        List<MntRow> rows = List.of(
                new MntRow(MntRecordType.FDETL, List.of("SKU1", "S", "001", "100", "VND", "2026-07-17", "")),
                new MntRow(MntRecordType.FDELE, List.of("SKU2", "Z", "NORTH"))
            );
        Path file = builder.build(rows, LocalDate.of(2026,7,15));
        List<String> lines = Files.readAllLines(file);

        assertThat(lines).containsExactly("FHEAD,2026-07-15", "FDETL,SKU1,S,001,100,VND,2026-07-17,","FDELE,SKU2,Z,NORTH","FTAIL,2");
    }

    @Test
    void escape_rfc4180_gia_tri_ban_khong_be_gay_file() throws IOException {
        List<MntRow> rows = List.of(
                new MntRow(MntRecordType.FDETL, List.of("a,b", "say \"hi\"", "clean")));
        Path file = builder.build(rows, LocalDate.of(2026, 7, 15));
        String content = Files.readString(file);

        // "a,b" (có phẩy) → bọc nháy;  say "hi" (có nháy) → nhân đôi nháy + bọc;  clean → giữ nguyên
        assertThat(content).contains("FDETL,\"a,b\",\"say \"\"hi\"\"\",clean");
    }

}
