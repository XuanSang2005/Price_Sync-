package price_sync.intake;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@RestController
public class IntakeController {
    private final IntakeService intakeService;

    public IntakeController(IntakeService intakeService) {
        this.intakeService = intakeService;
    }

    @PostMapping("/api/v1/price-events")
    public ResponseEntity<String> receive(@RequestBody PriceBatchRequest body) {
        String batchId = intakeService.accept(body);
        return ResponseEntity.accepted().body(batchId);
    }
}
