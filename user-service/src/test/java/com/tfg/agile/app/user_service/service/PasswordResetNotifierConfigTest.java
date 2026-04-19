package com.tfg.agile.app.user_service.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.MessageSource;
import org.springframework.mail.javamail.JavaMailSender;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
class PasswordResetNotifierConfigTest {

    @Mock
    private JavaMailSender mailSender;
    @Mock
    private MessageSource messageSource;

    private final PasswordResetNotifierConfig config = new PasswordResetNotifierConfig();

    @Test
    void smtpPasswordResetNotifier_returnsSmtpImplementation() {
        PasswordResetNotifier notifier = config.smtpPasswordResetNotifier(mailSender, messageSource, "no-reply@agileflow.local");

        assertThat(notifier).isInstanceOf(SmtpPasswordResetNotifier.class);
    }

    @Test
    void loggingPasswordResetNotifier_returnsLoggingImplementation() {
        PasswordResetNotifier notifier = config.loggingPasswordResetNotifier();

        assertThat(notifier).isInstanceOf(LoggingPasswordResetNotifier.class);
    }
}

