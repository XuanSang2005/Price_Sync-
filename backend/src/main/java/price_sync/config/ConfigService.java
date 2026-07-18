package price_sync.config;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import price_sync.domain.Config;
import price_sync.domain.ConfigRepository;
import price_sync.intake.InValidIdException;

@Service
public class ConfigService {
    private final ConfigRepository configRepository;
    public ConfigService(ConfigRepository configRepository){
        this.configRepository = configRepository;
    }
    
    @Transactional
    public List<ConfigResponse> getAll(){
        return configRepository.findAll().stream().map(c -> new ConfigResponse(c.getConfigKey(), c.getConfigValue())).toList();
    }

    @Transactional
    public void update(String key, String newValue){
        Config config = configRepository.findByConfigKey(key).orElseThrow(InValidIdException::new);
        config.updateValue(newValue);
    }
}
