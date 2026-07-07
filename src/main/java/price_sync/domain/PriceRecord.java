package price_sync.domain;

import java.math.BigDecimal;
import java.time.LocalDate;

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

    protected PriceRecord() {
    }

    public PriceRecord(Long batchId, String changeId, int version, String itemId, String storeIdOrZone,
            BigDecimal price, String currency, LocalDate effectiveStart, LocalDate effectiveEnd, String changeType) {
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

    public void markValid(){
        this.validationStatus = RecordStatus.VALID;
    }

    public void setAside(String reason){
        this.validationStatus = RecordStatus.SET_ASIDE;
        this.setAsideReason = reason;

    }
}
