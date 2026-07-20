package price_sync.domain;

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

    @Column(name = "data_type")
    private String dataType; // STRING | NUMBER | DATE (null = không kiểm — field cố định)

    @Column(nullable = false)
    private boolean required; // true → thiếu thì set aside

    protected MappingRule() {
    }

    // Constructor gọn (test Mapper tự dựng luật — không quan tâm validate động).
    public MappingRule(String recordType, int position, String jsonField, String mntColumn, String ruleType,
            String ruleValue) {
        this(recordType, position, jsonField, mntColumn, ruleType, ruleValue, null, false);
    }

    // Constructor đầy đủ (API CRUD tạo luật kèm data_type/required).
    public MappingRule(String recordType, int position, String jsonField, String mntColumn, String ruleType,
            String ruleValue, String dataType, boolean required) {
        this.recordType = recordType;
        this.position = position;
        this.jsonField = jsonField;
        this.mntColumn = mntColumn;
        this.ruleType = ruleType;
        this.ruleValue = ruleValue;
        this.dataType = dataType;
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

    public String getDataType() {
        return dataType;
    }

    public boolean isRequired() {
        return required;
    }
}
