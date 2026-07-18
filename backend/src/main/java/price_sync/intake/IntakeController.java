package price_sync.intake;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import price_sync.domain.PriceBatch;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@RestController
public class IntakeController {
    private final IntakeService intakeService;

    public IntakeController(IntakeService intakeService) {
        this.intakeService = intakeService;
    }

    @PostMapping("/api/v1/price-events")
    public ResponseEntity<IntakeResponse> receive(@RequestBody PriceBatchRequest body) {
        PriceBatch saved = intakeService.accept(body);
        IntakeResponse response = new IntakeResponse(saved.getBatchId(), saved.getVersion(), saved.getStatus(), body.records().size());
        return ResponseEntity.accepted().body(response);
    }
}
