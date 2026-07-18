package price_sync.domain;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ConfigRepository extends JpaRepository<Config, Long> {
    Optional<Config> findByConfigKey(String configKey);
}
