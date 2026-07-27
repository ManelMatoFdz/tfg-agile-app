package com.tfg.agile.app.user_service.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatCode;

class LoggingNotifiersTest {

    @Test
    void loggingPasswordResetNotifier_doesNotThrow() {
        LoggingPasswordResetNotifier notifier = new LoggingPasswordResetNotifier();

        assertThatCode(() -> notifier.sendPasswordReset("john@example.com", "https://app/reset?token=abc"))
                .doesNotThrowAnyException();
    }
}

