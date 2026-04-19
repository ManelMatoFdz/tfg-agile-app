package com.tfg.agile.app.user_service.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.javamail.JavaMailSender;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
class NotificationEmailSenderConfigTest {

    @Mock
    private JavaMailSender mailSender;

    private final NotificationEmailSenderConfig config = new NotificationEmailSenderConfig();

    @Test
    void smtpNotificationEmailSender_returnsSmtpImplementation() {
        NotificationEmailSender sender = config.smtpNotificationEmailSender(mailSender, "no-reply@agileflow.local");

        assertThat(sender).isInstanceOf(SmtpNotificationEmailSender.class);
    }

    @Test
    void loggingNotificationEmailSender_returnsLoggingImplementation() {
        NotificationEmailSender sender = config.loggingNotificationEmailSender();

        assertThat(sender).isInstanceOf(LoggingNotificationEmailSender.class);
    }
}

