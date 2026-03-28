package com.tfg.agile.app.user_service.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class LoggingPasswordResetNotifier implements PasswordResetNotifier {

    private static final Logger log = LoggerFactory.getLogger(LoggingPasswordResetNotifier.class);

    @Override
    public void sendPasswordReset(String email, String resetLink) {
        log.info("Password reset link prepared for {}: {}", email, resetLink);
    }
}
