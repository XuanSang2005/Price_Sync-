package price_sync.domain.mapping;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "mapping_rule")
public class MappingRule {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "record_type", nullable = false)
    private String recordType; 

    @Column(nullable = false)
    private int position; 

    @Column(name = "json_field", nullable = false)
    private String jsonField; 

    @Column(name = "mnt_column", nullable = false)
    private String mntColumn; 

    @Column(name = "rule_type", nullable = false)
    private String ruleType; 

    @Column(name = "rule_value")
    private String ruleValue;

    @Column(nullable = false)
    private boolean required;

    // Cột chuẩn (hợp đồng Oracle) — khoá cứng ở UI: không đổi nguồn / không xoá.
    // Chỉ true cho các dòng SEED chuẩn (V19 set); rule tạo qua API luôn false (constructor không set).
    @Column(nullable = false)
    private boolean locked;

    protected MappingRule() {
    }

    public MappingRule(String recordType, int position, String jsonField, String mntColumn, String ruleType,
            String ruleValue) {
        this(recordType, position, jsonField, mntColumn, ruleType, ruleValue, false);
    }

    public MappingRule(String recordType, int position, String jsonField, String mntColumn, String ruleType,
            String ruleValue, boolean required) {
        this.recordType = recordType;
        this.position = position;
        this.jsonField = jsonField;
        this.mntColumn = mntColumn;
        this.ruleType = ruleType;
        this.ruleValue = ruleValue;
        this.required = required;
    }

    public Long getId() {
        return id;
    }

    public String getRecordType() {
        return recordType;
    }

    public int getPosition() {
        return position;
    }

    public String getJsonField() {
        return jsonField;
    }

    public String getMntColumn() {
        return mntColumn;
    }

    public String getRuleType() {
        return ruleType;
    }

    public String getRuleValue() {
        return ruleValue;
    }

    public boolean isRequired() {
        return required;
    }

    public boolean isLocked() {
        return locked;
    }
}
