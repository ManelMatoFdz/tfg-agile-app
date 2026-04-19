package com.tfg.agile.app.user_service.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

import java.util.Locale;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SmtpPasswordResetNotifierTest {

    @Mock
    private JavaMailSender mailSender;
    @Mock
    private MessageSource messageSource;

    @Test
    void sendPasswordReset_buildsEmailUsingLocalizedSubjectAndBody() {
        LocaleContextHolder.setLocale(Locale.ENGLISH);
        when(messageSource.getMessage(anyString(), any(), anyString(), any(Locale.class)))
                .thenReturn("Password recovery", "Use this link: https://app/reset?token=abc");

        SmtpPasswordResetNotifier notifier = new SmtpPasswordResetNotifier(
                mailSender,
                messageSource,
                "no-reply@agileflow.local"
        );

        notifier.sendPasswordReset("john@example.com", "https://app/reset?token=abc");

        ArgumentCaptor<SimpleMailMessage> mailCaptor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(mailCaptor.capture());

        SimpleMailMessage message = mailCaptor.getValue();
        assertThat(message.getTo()).containsExactly("john@example.com");
        assertThat(message.getFrom()).isEqualTo("no-reply@agileflow.local");
        assertThat(message.getSubject()).isEqualTo("Password recovery");
        assertThat(message.getText()).isEqualTo("Use this link: https://app/reset?token=abc");
    }
}

