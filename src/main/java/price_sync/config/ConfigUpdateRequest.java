package price_sync.config;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ConfigUpdateRequest(@JsonProperty("config_value") String configValue) {}
