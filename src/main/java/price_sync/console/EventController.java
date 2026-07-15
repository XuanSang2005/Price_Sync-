package price_sync.console;

import org.springframework.web.bind.annotation.RestController;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;



@RestController
public class EventController {
    private final EventService eventService; 

    public EventController(EventService eventService){
        this.eventService = eventService;
    }
    
    @GetMapping("/api/v1/events")
    public List<EventSummary> getEvents(){
        return eventService.getEvents();
    }

    @GetMapping("/api/v1/events/{id}")
    public EventDetail getEventDetail(@PathVariable Long id) {
        return eventService.getEventDetails(id);
    }
    
    
}
