package com.tfg.agile.app.user_service.service;

import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
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
    void sendPasswordReset_sendsHtmlEmailWithLocalizedSubject() throws Exception {
        LocaleContextHolder.setLocale(Locale.ENGLISH);

        MimeMessage realMimeMessage = new MimeMessage((jakarta.mail.Session) null);
        when(mailSender.createMimeMessage()).thenReturn(realMimeMessage);
        when(messageSource.getMessage(anyString(), any(), anyString(), any(Locale.class)))
                .thenReturn("Reset your AgileApp password");

        SmtpPasswordResetNotifier notifier = new SmtpPasswordResetNotifier(
                mailSender,
                messageSource,
                "no-reply@agileflow.local"
        );

        notifier.sendPasswordReset("john@example.com", "https://app/reset?token=abc");

        ArgumentCaptor<MimeMessage> captor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender).send(captor.capture());

        MimeMessage sent = captor.getValue();
        assertThat(sent.getSubject()).isEqualTo("Reset your AgileApp password");
        assertThat(sent.getAllRecipients()).isNotEmpty();
        assertThat(sent.getContent()).isNotNull();
    }
}