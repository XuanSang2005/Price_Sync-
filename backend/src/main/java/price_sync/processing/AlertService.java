package price_sync.processing;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import price_sync.domain.batch.PriceBatch;


@Service
public class AlertService {
    private static final Logger log = LoggerFactory.getLogger(AlertService.class);
    private final JavaMailSender mailSender;
    private final String alertTo;
    private final String alertFrom;

    public AlertService(JavaMailSender mailSender,
            @Value("${app.alert.to:sangbom2005@gmail.com}") String alertTo,
            @Value("${app.alert.from:sangbom2005@gmail.com}") String alertFrom) {
        this.mailSender = mailSender;
        this.alertTo = alertTo;
        this.alertFrom = alertFrom;
    }

    public void batchFailed(PriceBatch batch, String reason) {
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setFrom(alertFrom);
            msg.setTo(alertTo);
            msg.setSubject("[Price Sync] Batch FAILED: " + batch.getBatchId());
            msg.setText("Batch " + batch.getBatchId() + " (id=" + batch.getId() + ", version=" + batch.getVersion()
                    + ") da FAILED.\n"
                    + "Ly do: " + reason + "\n"
                    + "Can nguoi xu ly. Re-drive: POST /api/v1/events/" + batch.getId() + "/retry");
            mailSender.send(msg);
            log.info("Da gui alert email FAILED cho batch {}", batch.getId());
        } catch (Exception e) {
            log.error("Gui alert email that bai (batch {}): {}", batch.getId(), e.getMessage());
        }
    }
}
