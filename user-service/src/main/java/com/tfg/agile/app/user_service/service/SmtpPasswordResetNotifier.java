package com.tfg.agile.app.user_service.service;

import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

import java.util.Locale;

public class SmtpPasswordResetNotifier implements PasswordResetNotifier {

    private static final String SUBJECT_MESSAGE_KEY = "auth.reset-password.mail.subject";
    private static final String BODY_MESSAGE_KEY = "auth.reset-password.mail.body";
    private static final String DEFAULT_SUBJECT = "Password recovery";

    private final JavaMailSender mailSender;
    private final MessageSource messageSource;
    private final String fromAddress;

    public SmtpPasswordResetNotifier(JavaMailSender mailSender, MessageSource messageSource, String fromAddress) {
        this.mailSender = mailSender;
        this.messageSource = messageSource;
        this.fromAddress = fromAddress;
    }

    @Override
    public void sendPasswordReset(String email, String resetLink) {
        Locale locale = LocaleContextHolder.getLocale();
        String subject = messageSource.getMessage(SUBJECT_MESSAGE_KEY, null, DEFAULT_SUBJECT, locale);
        String body = messageSource.getMessage(
                BODY_MESSAGE_KEY,
                new Object[]{resetLink},
                "Use this link to reset your password: " + resetLink,
                locale
        );

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(email);
        message.setFrom(fromAddress);
        message.setSubject(subject);
        message.setText(body);
        mailSender.send(message);
    }
}
