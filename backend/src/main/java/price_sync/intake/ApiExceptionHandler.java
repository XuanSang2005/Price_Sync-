package price_sync.intake;

import java.time.OffsetDateTime;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(DuplicateBatchException.class)
    public ResponseEntity<ErrorResponse> handleDuplicate(DuplicateBatchException e){
        ErrorResponse body = new ErrorResponse("BATCH_DUPLICATE", e.getMessage(), e.getBatchId(), e.getVersion(), OffsetDateTime.now());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
    }    
}


