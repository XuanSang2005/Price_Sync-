package price_sync.security;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
public class SecurityConfig {
    private final String apiKey;
    private final List<String> ipAllowList;
    private final String hmacSecret;
    private final Long timeStampt;

    public SecurityConfig(@Value("${app.security.api-key}") String apiKey,
            @Value("${app.security.ip-allowlist}") List<String> ipAllowList,
            @Value("${app.security.hmac-secret}") String hmacSecret,
            @Value("${app.security.timestamp-window-seconds}") Long timeStampt) {
        this.apiKey = apiKey;
        this.ipAllowList = ipAllowList;
        this.hmacSecret = hmacSecret;
        this.timeStampt = timeStampt;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.csrf(csrf -> csrf.disable())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
                .addFilterBefore(new ApiKeyFilter(apiKey), UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(new IpAllowListFilter(ipAllowList), ApiKeyFilter.class)
                .addFilterBefore(new HmacFIlter(hmacSecret), ApiKeyFilter.class)
                .addFilterBefore(new TimestampFilter(timeStampt), HmacFIlter.class);
        return http.build();
    }
}
