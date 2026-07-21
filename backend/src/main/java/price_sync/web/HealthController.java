package price_sync.web;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import price_sync.domain.batch.PriceBatchRepository;

// Kiểm tra sức khoẻ THẬT: API sống + DB đọc được (một query đếm nhẹ).
// Dùng cho dải "Connection health" trên Dashboard/Connections thay vì chấm xanh bịa.
@RestController
public class HealthController {
    private final PriceBatchRepository priceBatchRepository;

    public HealthController(PriceBatchRepository priceBatchRepository) {
        this.priceBatchRepository = priceBatchRepository;
    }

    @GetMapping("/api/v1/health")
    public Map<String, Object> health() {
        Map<String, Object> out = new LinkedHashMap<>();
        boolean dbOk;
        try {
            priceBatchRepository.count();
            dbOk = true;
        } catch (Exception e) {
            dbOk = false;
        }
        out.put("status", dbOk ? "ok" : "degraded");
        out.put("api", true);
        out.put("db", dbOk);
        out.put("checked_at", OffsetDateTime.now().toString());
        return out;
    }
}
