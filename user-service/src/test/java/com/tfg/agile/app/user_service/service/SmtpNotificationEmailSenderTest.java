package com.tfg.agile.app.user_service.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class SmtpNotificationEmailSenderTest {

    @Mock
    private JavaMailSender mailSender;

    @Test
    void sendNotification_usesDefaultSubjectAndBodyWhenBlank() {
        SmtpNotificationEmailSender sender = new SmtpNotificationEmailSender(mailSender, "no-reply@agileflow.local");

        sender.sendNotification("john@example.com", " ", " ", " ");

        ArgumentCaptor<SimpleMailMessage> mailCaptor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(mailCaptor.capture());

        SimpleMailMessage message = mailCaptor.getValue();
        assertThat(message.getTo()).containsExactly("john@example.com");
        assertThat(message.getFrom()).isEqualTo("no-reply@agileflow.local");
        assertThat(message.getSubject()).isEqualTo("New notification");
        assertThat(message.getText()).isEqualTo("You have a new notification.");
    }

    @Test
    void sendNotification_appendsTrimmedLinkAfterMessage() {
        SmtpNotificationEmailSender sender = new SmtpNotificationEmailSender(mailSender, "no-reply@agileflow.local");

        sender.sendNotification("john@example.com", "  Title  ", "  Body  ", "  /projects/1  ");

        ArgumentCaptor<SimpleMailMessage> mailCaptor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(mailCaptor.capture());

        SimpleMailMessage message = mailCaptor.getValue();
        assertThat(message.getSubject()).isEqualTo("Title");
        assertThat(message.getText()).isEqualTo("Body" + System.lineSeparator() + System.lineSeparator() + "Link: /projects/1");
    }
}

