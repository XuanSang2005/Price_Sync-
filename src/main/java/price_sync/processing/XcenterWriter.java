package price_sync.processing;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

import org.springframework.stereotype.Component;

import price_sync.domain.PriceBatch;

@Component
public class XcenterWriter implements OutputWriter {
    public Path write(Path tempFile, PriceBatch batch) throws IOException {
        Path folder = Path.of("xcenter-inbound");
        Files.createDirectories(folder);

        String ts = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        String name = "pricesync_" + batch.getBatchId() + "_v" + batch.getVersion() + "_" + ts + ".mnt";
        Path target = folder.resolve(name);
        Files.copy(tempFile, target);
        return target;
    }

}
