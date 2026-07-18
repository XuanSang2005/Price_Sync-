package price_sync;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class PriceSyncApplication {

	public static void main(String[] args) {
		SpringApplication.run(PriceSyncApplication.class, args);
	}

}
