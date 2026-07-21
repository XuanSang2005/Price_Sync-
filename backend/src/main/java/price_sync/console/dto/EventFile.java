package price_sync.console.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

// Nội dung file MNT đã ghi ra cho một batch (đọc THẬT từ thư mục Xcenter inbound).
public record EventFile(
        @JsonProperty("file_name") String fileName,
        @JsonProperty("exists") boolean exists,
        @JsonProperty("content") String content,
        @JsonProperty("note") String note) {
}
