package price_sync.processing.writer;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

import org.springframework.stereotype.Component;

import price_sync.domain.config.ConfigRepository;
import price_sync.domain.batch.PriceBatch;

@Component
public class XcenterWriter implements OutputWriter {
    private final ConfigRepository configRepository;

    public XcenterWriter(ConfigRepository configRepository) {
        this.configRepository = configRepository;
    }

    public Path write(Path tempFile, PriceBatch batch) throws IOException {
        String inbound_folder = configRepository.findByConfigKey("xcenter_inbound_path").map(c -> c.getConfigValue())
                .orElse("xcenter-inbound");

        Path folder = Path.of(inbound_folder);

        Files.createDirectories(folder);

        String filePattern = configRepository.findByConfigKey("filename_pattern").map(c -> c.getConfigValue())
                .orElse("pricesync_<batch_id>_v<version>_<ts>.mnt");

        String ts = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        String name = filePattern
                .replace("<batch_id>", batch.getBatchId())
                .replace("<version>", String.valueOf(batch.getVersion()))
                .replace("<ts>", ts);
        Path target = folder.resolve(name);
        Files.copy(tempFile, target);
        return target;
    }

}
