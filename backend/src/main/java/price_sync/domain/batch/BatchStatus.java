package price_sync.domain.batch;

public enum BatchStatus {
    RECEIVED, FAILED, PROCESSING, WRITING, PENDING_WRITE, WRITTEN, PARTIAL
}
