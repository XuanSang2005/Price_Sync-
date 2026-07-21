package price_sync.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;


@Controller
public class SpaController {

    @GetMapping({ "/dashboard", "/events", "/events/**", "/logs", "/connections", "/mapping", "/config" })
    public String forwardToIndex() {
        return "forward:/index.html";
    }
}
