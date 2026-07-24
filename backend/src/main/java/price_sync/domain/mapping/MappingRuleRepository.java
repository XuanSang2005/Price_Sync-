package price_sync.domain.mapping;

import org.springframework.data.jpa.repository.JpaRepository;

public interface MappingRuleRepository extends JpaRepository<MappingRule, Long> {


    boolean existsByJsonField(String jsonField);
}
