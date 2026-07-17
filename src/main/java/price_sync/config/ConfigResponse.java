package price_sync.config;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ConfigResponse(@JsonProperty("config_key") String configKey,
        @JsonProperty("config_value") String configValue) {}
