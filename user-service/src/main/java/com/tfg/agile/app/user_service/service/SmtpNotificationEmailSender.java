package com.tfg.agile.app.user_service.service;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

public class SmtpNotificationEmailSender implements NotificationEmailSender {

    private final JavaMailSender mailSender;
    private final String fromAddress;

    public SmtpNotificationEmailSender(JavaMailSender mailSender, String fromAddress) {
        this.mailSender = mailSender;
        this.fromAddress = fromAddress;
    }

    @Override
    public void sendNotification(String email, String title, String message, String link) {
        String subject = (title == null || title.isBlank()) ? "New notification" : title.trim();

        StringBuilder bodyBuilder = new StringBuilder();
        if (message != null && !message.isBlank()) {
            bodyBuilder.append(message.trim());
        }
        if (link != null && !link.isBlank()) {
            if (!bodyBuilder.isEmpty()) {
                bodyBuilder.append(System.lineSeparator()).append(System.lineSeparator());
            }
            bodyBuilder.append("Link: ").append(link.trim());
        }

        SimpleMailMessage mailMessage = new SimpleMailMessage();
        mailMessage.setTo(email);
        mailMessage.setFrom(fromAddress);
        mailMessage.setSubject(subject);
        mailMessage.setText(bodyBuilder.isEmpty() ? "You have a new notification." : bodyBuilder.toString());
        mailSender.send(mailMessage);
    }
}
