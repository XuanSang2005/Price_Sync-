package price_sync.console;

import org.springframework.web.bind.annotation.RestController;

import price_sync.domain.BatchStatus;
import price_sync.processing.BatchProcessor;

import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;

@RestController
public class EventController {
    private final EventService eventService;
    private final BatchProcessor batchProcessor;

    public EventController(EventService eventService, BatchProcessor batchProcessor) {
        this.eventService = eventService;
        this.batchProcessor = batchProcessor;
    }

    @GetMapping("/api/v1/events")
    public List<EventSummary> getEvents() {
        return eventService.getEvents();
    }

    @GetMapping("/api/v1/events/{id}")
    public EventDetail getEventDetails(@PathVariable Long id) {
        return eventService.getEventDetails(id);
    }

    @GetMapping("/api/v1/events/metrics")
    public Map<BatchStatus, Long> getMetrics() {
        return eventService.getMetrics();
    }

    @GetMapping("/api/v1/events/{id}/logs")
    public List<EventLog> getLogs(@PathVariable Long id) {
        return eventService.getLogs(id);
    }

    @PostMapping("/api/v1/events/{id}/retry")
    public ResponseEntity<String> retry(@PathVariable Long id) {
        if (batchProcessor.retry(id)) {
            return ResponseEntity.accepted().body("Receive"); // 202 nếu FAILED → redrive
        }
        return ResponseEntity.ok("Done"); // 200 nếu không
    }

}
