package price_sync.processing;

import java.io.BufferedWriter;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.List;

import org.springframework.stereotype.Component;

@Component
public class XstoreMntBuilder implements PayloadBuilder {
    public Path build(List<MntRow>rows, LocalDate businessDate) throws IOException{
        int count = 0;
        Path file = Files.createTempFile("price_sync",".mnt");
        try (BufferedWriter writer = Files.newBufferedWriter(file)){
            writer.write("FHEAD," + businessDate);
            writer.newLine();
            for(MntRow row : rows){
                count++;
                String line = row.recordType() + "," + String.join(",", row.columns());
                writer.write(line);
                writer.newLine();
            }
            writer.write("FTAIL," + count);
            writer.newLine();
            return file;
        }
    }
    
}
