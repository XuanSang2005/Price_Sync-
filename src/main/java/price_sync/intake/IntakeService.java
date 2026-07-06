package price_sync.intake;

import org.springframework.stereotype.Service;

@Service
public class IntakeService {
    public String accept(PriceBatchRequest batch){
        return batch.batchId();
    }
}
