package com.tfg.agile.app.user_service.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.MessageSource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSender;

@Configuration
public class PasswordResetNotifierConfig {

    @Bean
    @ConditionalOnProperty(prefix = "app.mail", name = "enabled", havingValue = "true")
    public PasswordResetNotifier smtpPasswordResetNotifier(
            JavaMailSender mailSender,
            MessageSource messageSource,
            @Value("${app.mail.from:no-reply@agileflow.local}") String fromAddress
    ) {
        return new SmtpPasswordResetNotifier(mailSender, messageSource, fromAddress);
    }

    @Bean
    @ConditionalOnProperty(prefix = "app.mail", name = "enabled", havingValue = "false", matchIfMissing = true)
    public PasswordResetNotifier loggingPasswordResetNotifier() {
        return new LoggingPasswordResetNotifier();
    }
}
