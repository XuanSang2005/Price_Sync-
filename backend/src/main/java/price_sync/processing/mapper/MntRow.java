package price_sync.processing.mapper;

import java.util.List;

public record MntRow(MntRecordType recordType, List<String> columns){

}
