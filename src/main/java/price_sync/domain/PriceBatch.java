package price_sync.domain;

import java.time.OffsetDateTime;


import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "price_batch")
public class PriceBatch {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "batch_id", nullable = false)
    private String batchId;

    @Column(nullable = false)
    private int version;

    @Column(name = "generated_at")
    private OffsetDateTime generatedAt;

    @Column(name = "owner_instance")
    private String ownerInstance;

    @Column(name = "claimed_at")
    private OffsetDateTime claimedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private BatchStatus status;

    protected PriceBatch() {
    }

    public PriceBatch(String batchId, int version, OffsetDateTime generatedAt) {
        this.batchId = batchId;
        this.version = version;
        this.generatedAt = generatedAt;
        this.status = BatchStatus.RECEIVED;
    }

    public Long getId() {
        return id;
    }

    public String getBatchId() {
        return batchId;
    }

    public int getVersion() {
        return version;
    }

    public BatchStatus getStatus() {
        return status;
    }

    public OffsetDateTime getGeneratedAt() {
        return generatedAt;
    }

    public String getOwnerInstance() {
        return ownerInstance;
    }

    public OffsetDateTime getClaimedAt() {
        return claimedAt;
    }

    public BatchStatus markProcessing(String owner) {
        status = BatchStatus.PROCESSING;
        ownerInstance = owner;
        claimedAt = OffsetDateTime.now();
        return status;
    }
    public void markFail(){
        status = BatchStatus.FAILED;
    }
    public void markWritten(){
        status = BatchStatus.WRITTEN;
    }
}
