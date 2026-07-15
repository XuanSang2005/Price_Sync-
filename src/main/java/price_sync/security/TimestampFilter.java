package price_sync.security;

import java.io.IOException;
import java.time.OffsetDateTime;

import org.springframework.lang.NonNull;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

public class TimestampFilter extends OncePerRequestFilter {

    private final long allowSkewSeconds;

    public TimestampFilter(long allowSkewSeconds) {
        this.allowSkewSeconds = allowSkewSeconds;
    }

    @Override
    public void doFilterInternal(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws IOException, ServletException {
        Long now = OffsetDateTime.now().toEpochSecond();
        String header = request.getHeader("X-Timestamp");
        if (header == null) {
            response.setStatus(401);
            return;
        }
        Long timeSend;
        try {
            timeSend = Long.parseLong(header);
        } catch (NumberFormatException e) {
            response.setStatus(401);
            return;
        }
        if (Math.abs(now - timeSend) > allowSkewSeconds) {
            response.setStatus(401);
            return;
        }
        filterChain.doFilter(request, response);
    }

    @Override
    protected boolean shouldNotFilter(@org.springframework.lang.NonNull HttpServletRequest request) {
        return !request.getRequestURI().equals("/api/v1/price-events");
    }

}
