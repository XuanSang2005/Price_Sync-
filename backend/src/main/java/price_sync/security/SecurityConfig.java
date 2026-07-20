package price_sync.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import price_sync.domain.ConfigRepository;

@Configuration
public class SecurityConfig {
    private final String apiKey;
    private final String hmacSecret;
    private final ConfigRepository configRepository;

    public SecurityConfig(@Value("${app.security.api-key}") String apiKey,
            @Value("${app.security.hmac-secret}") String hmacSecret,
            ConfigRepository configRepository) {
        this.apiKey = apiKey;
        this.hmacSecret = hmacSecret;
        this.configRepository = configRepository;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.csrf(csrf -> csrf.disable())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
                .addFilterBefore(new ApiKeyFilter(apiKey), UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(new IpAllowListFilter(configRepository), ApiKeyFilter.class)
                .addFilterBefore(new HmacFIlter(hmacSecret), ApiKeyFilter.class)
                .addFilterBefore(new TimestampFilter(configRepository), HmacFIlter.class);
        return http.build();
    }
}
