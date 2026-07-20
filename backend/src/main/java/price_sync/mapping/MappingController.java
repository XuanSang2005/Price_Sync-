package price_sync.mapping;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class MappingController {
    private final MappingService mappingService;

    public MappingController(MappingService mappingService) {
        this.mappingService = mappingService;
    }

    @GetMapping("/api/v1/mappings")
    public List<MappingResponse> list() {
        return mappingService.getAll();
    }

    @PostMapping("/api/v1/mappings")
    public ResponseEntity<String> create(@RequestBody MappingCreateRequest body) {
        mappingService.create(body);
        return ResponseEntity.status(HttpStatus.CREATED).body("Created");
    }

    @DeleteMapping("/api/v1/mappings/{id}")
    public ResponseEntity<String> delete(@PathVariable Long id) {
        mappingService.delete(id);
        return ResponseEntity.ok("Deleted");
    }
}
