package price_sync.processing.writer;

import price_sync.processing.mapper.MntRow;

import java.io.IOException;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.List;

public interface PayloadBuilder {
    Path build(List<MntRow> rows, LocalDate businessDate) throws IOException;

}
