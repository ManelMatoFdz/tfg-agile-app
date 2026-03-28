package com.tfg.agile.app.user_service.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class LoggingNotificationEmailSender implements NotificationEmailSender {

    private static final Logger log = LoggerFactory.getLogger(LoggingNotificationEmailSender.class);

    @Override
    public void sendNotification(String email, String title, String message, String link) {
        log.info(
                "Notification email prepared for {} -> title='{}', message='{}', link='{}'",
                email,
                title,
                message,
                link
        );
    }
}
