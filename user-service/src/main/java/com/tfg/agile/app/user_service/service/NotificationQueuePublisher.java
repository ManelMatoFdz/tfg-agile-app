package com.tfg.agile.app.user_service.service;

import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(prefix = "app.notifications.queue", name = "enabled", havingValue = "true")
public class NotificationQueuePublisher {

    private final RabbitTemplate rabbitTemplate;
    private final String exchange;
    private final String routingKey;

    public NotificationQueuePublisher(
            RabbitTemplate rabbitTemplate,
            @Value("${app.notifications.queue.exchange:agileflow.notifications}") String exchange,
            @Value("${app.notifications.queue.routing-key:user-service.notification}") String routingKey
    ) {
        this.rabbitTemplate = rabbitTemplate;
        this.exchange = exchange;
        this.routingKey = routingKey;
    }

    public void publish(NotificationQueueMessage message) {
        rabbitTemplate.convertAndSend(exchange, routingKey, message);
    }
}
