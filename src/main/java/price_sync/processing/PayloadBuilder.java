package price_sync.processing;

import java.io.IOException;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.List;

public interface PayloadBuilder {
    Path build(List<MntRow> rows, LocalDate businessDate) throws IOException;

}
