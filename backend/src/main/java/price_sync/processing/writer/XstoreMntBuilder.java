package price_sync.processing.writer;

import price_sync.processing.mapper.MntRow;

import java.io.BufferedWriter;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

@Component
public class XstoreMntBuilder implements PayloadBuilder {
    public Path build(List<MntRow> rows, LocalDate businessDate) throws IOException {
        int count = 0;
        Path file = Files.createTempFile("price_sync", ".mnt");
        try (BufferedWriter writer = Files.newBufferedWriter(file)) {
            writer.write("FHEAD," + businessDate);
            writer.newLine();
            for (MntRow row : rows) {
                count++;
                // Escape RFC-4180 TỪNG ô trước khi ghép, để giá trị "bẩn" (có dấu phẩy / xuống dòng)
                // không bẻ gãy cột hay tách record của các dòng khác.
                String line = row.recordType() + ","
                        + row.columns().stream().map(this::escape).collect(Collectors.joining(","));
                writer.write(line);
                writer.newLine();
            }
            writer.write("FTAIL," + count);
            writer.newLine();
            return file;
        }
    }

    // Escape RFC-4180: ô chứa dấu phẩy / nháy kép / xuống dòng → bọc trong nháy kép,
    // và nhân đôi mọi nháy kép bên trong (" → ""). Ô "sạch" giữ nguyên.
    private String escape(String value) {
        if (value == null) {
            return "";
        }
        if (value.contains(",") || value.contains("\"") || value.contains("\n") || value.contains("\r")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }
}
