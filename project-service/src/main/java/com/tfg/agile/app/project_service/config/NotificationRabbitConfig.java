package com.tfg.agile.app.project_service.config;

import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.support.converter.JacksonJsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class NotificationRabbitConfig {

    @Bean
    public MessageConverter rabbitMessageConverter() {
        return new JacksonJsonMessageConverter();
    }

    @Bean
    public TopicExchange notificationsExchange(
            @Value("${app.notifications.exchange:agileflow.notifications}") String exchangeName
    ) {
        return new TopicExchange(exchangeName, true, false);
    }
}
