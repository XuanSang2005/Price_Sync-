package price_sync.intake;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class DuplicateBatchException extends RuntimeException {
    private final String batchId;
    private final int version;

    public DuplicateBatchException(String batchId, int version){
        super("batch_id+version already received: " + batchId + "v" + version);
        this.batchId = batchId;
        this.version = version;
    }

    public String getBatchId() {
        return batchId;
    }

    public int getVersion() {
        return version;
    }
    
}
