package price_sync.domain;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.lang.NonNull;

public interface ConfigRepository extends JpaRepository<Config, Long> {
    Optional<Config> findByConfigKey(String configKey);
}
