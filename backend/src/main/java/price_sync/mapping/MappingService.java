package price_sync.mapping;

import java.util.Comparator;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import price_sync.domain.MappingRule;
import price_sync.domain.MappingRuleRepository;

@Service
public class MappingService {
    private final MappingRuleRepository mappingRuleRepository;

    public MappingService(MappingRuleRepository mappingRuleRepository) {
        this.mappingRuleRepository = mappingRuleRepository;
    }

    // Danh sách luật, sắp theo record_type rồi position (thứ tự cột ổn định cho UI).
    @Transactional
    public List<MappingResponse> getAll() {
        return mappingRuleRepository.findAll().stream()
                .sorted(Comparator.comparing(MappingRule::getRecordType).thenComparingInt(MappingRule::getPosition))
                .map(r -> new MappingResponse(r.getId(), r.getRecordType(), r.getPosition(), r.getJsonField(),
                        r.getMntColumn(), r.getRuleType(), r.getRuleValue(), r.getDataType(), r.isRequired()))
                .toList();
    }

    // Khai một luật mới (thêm một cột / một field vào sổ).
    @Transactional
    public void create(MappingCreateRequest req) {
        mappingRuleRepository.save(new MappingRule(req.recordType(), req.position(), req.jsonField(),
                req.mntColumn(), req.ruleType(), req.ruleValue(), req.dataType(), req.required()));
    }

    // Gỡ một luật (idempotent — id không tồn tại thì bỏ qua).
    @Transactional
    public void delete(Long id) {
        mappingRuleRepository.deleteById(id);
    }
}
