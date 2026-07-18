package price_sync.domain;

public enum BatchStatus {
    RECEIVED, FAILED, PROCESSING, WRITING, PENDING_WRITE, WRITTEN, PARTIAL
}
