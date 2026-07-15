package price_sync.console;

import org.springframework.web.bind.annotation.RestController;

import price_sync.domain.BatchStatus;

import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@RestController
public class EventController {
    private final EventService eventService;

    public EventController(EventService eventService) {
        this.eventService = eventService;
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

}
