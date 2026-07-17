package price_sync.config;

import org.springframework.web.bind.annotation.RestController;


import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PathVariable;



@RestController
public class ConfigController {
    private final ConfigService configService;
    public ConfigController(ConfigService configService){
        this.configService = configService;
    }
    
    @GetMapping("/api/v1/config")
    public List<ConfigResponse> getConfig() {
        return configService.getAll();
    }

    @PutMapping("/api/v1/config/{key}")
    public ResponseEntity<String> updateConfig(@PathVariable String key, @RequestBody ConfigUpdateRequest body) {
        configService.update(key, body.configValue());
        return ResponseEntity.ok("Done");    
    }
    
}
