package com.tfg.agile.app.user_service.service;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.amqp.rabbit.annotation.EnableRabbit;

@Configuration
@EnableRabbit
@ConditionalOnProperty(prefix = "app.notifications.queue", name = "enabled", havingValue = "true")
public class NotificationQueueConfig {

    @Bean
    public TopicExchange notificationsExchange(
            @Value("${app.notifications.queue.exchange:agileflow.notifications}") String exchangeName
    ) {
        return new TopicExchange(exchangeName, true, false);
    }

    @Bean
    public Queue notificationsQueue(
            @Value("${app.notifications.queue.name:user-service.notifications}") String queueName
    ) {
        return new Queue(queueName, true);
    }

    @Bean
    public Binding notificationsBinding(
            Queue notificationsQueue,
            TopicExchange notificationsExchange,
            @Value("${app.notifications.queue.routing-key:user-service.notification}") String routingKey
    ) {
        return BindingBuilder.bind(notificationsQueue).to(notificationsExchange).with(routingKey);
    }
}
