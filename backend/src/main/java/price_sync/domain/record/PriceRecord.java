package price_sync.domain.record;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "price_record")
public class PriceRecord {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "batch_id", nullable = false)
    private Long batchId;

    @Column(name = "change_id", nullable = false)
    private String changeId;

    @Column(nullable = false)
    private int version;

    @Column(name = "item_id", nullable = false)
    private String itemId;

    @Column(name = "store_id_or_zone", nullable = false)
    private String storeIdOrZone;

    private BigDecimal price;

    private String currency;

    @Column(name = "effective_start")
    private LocalDate effectiveStart;

    @Column(name = "effective_end")
    private LocalDate effectiveEnd;

    @Column(name = "change_type", nullable = false)
    private String changeType;

    @Enumerated(EnumType.STRING)
    @Column(name = "validation_status")
    private RecordStatus validationStatus = RecordStatus.PENDING;

    @Column(name = "set_aside_reason")
    private String setAsideReason;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "extras")
    private Map<String, Object> extras;

    protected PriceRecord() {
    }

    public PriceRecord(Long batchId, String changeId, int version, String itemId, String storeIdOrZone,
            BigDecimal price, String currency, LocalDate effectiveStart, LocalDate effectiveEnd, String changeType, Map<String, Object> extras) {
        this.batchId = batchId;
        this.changeId = changeId;
        this.version = version;
        this.itemId = itemId;
        this.storeIdOrZone = storeIdOrZone;
        this.price = price;
        this.currency = currency;
        this.effectiveStart = effectiveStart;
        this.effectiveEnd = effectiveEnd;
        this.changeType = changeType;
        this.extras = extras;
    }

    
    public String getChangeId() {
        return changeId;
    }

    public int getVersion() {
        return version;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public String getCurrency() {
        return currency;
    }

    public LocalDate getEffectiveStart() {
        return effectiveStart;
    }

    public LocalDate getEffectiveEnd() {
        return effectiveEnd;
    }

    public String getChangeType() {
        return changeType;
    }

    public Long getId() {
        return id;
    }

    public String getItemId() {
        return itemId;
    }

    public String getStoreIdOrZone() {
        return storeIdOrZone;
    }

    public Long getBatchId() {
        return batchId;
    }

    public RecordStatus getValidationStatus() {
        return validationStatus;
    }

    public String getSetAsideReason() {
        return setAsideReason;
    }

    public void markValid(){
        this.validationStatus = RecordStatus.VALID;
    }

    public void markSupersede(){
        this.validationStatus = RecordStatus.SUPERSEDED;
    }

    public void setAside(String reason){
        this.validationStatus = RecordStatus.SET_ASIDE;
        this.setAsideReason = reason;

    }

    public Map<String, Object> getExtras() {
        return extras;
    }

}
