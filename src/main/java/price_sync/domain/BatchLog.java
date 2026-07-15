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
@Table(name= "batch_log")
public class BatchLog {
    @Id
    @GeneratedValue(strategy =  GenerationType.IDENTITY)
    Long id;

    @Column(name = "batch_id", nullable = false)
    Long batchId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    BatchStatus status;

    @Column(name = "note")
    String note;

    @Column(name = "created_at")
    OffsetDateTime createdAt;

    protected BatchLog(){

    }

    public BatchLog(Long batchId, BatchStatus status, String note){
        this.batchId = batchId;
        this.status = status;
        this.note = note;
        this.createdAt = OffsetDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public Long getBatchId() {
        return batchId;
    }

    public BatchStatus getStatus() {
        return status;
    }

    public String getNote() {
        return note;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
}
