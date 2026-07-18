package price_sync.intake;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class InValidIdException extends RuntimeException {
    public InValidIdException(){

    }
}
