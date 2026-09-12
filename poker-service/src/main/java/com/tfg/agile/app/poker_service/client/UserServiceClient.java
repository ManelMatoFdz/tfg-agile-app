package com.tfg.agile.app.poker_service.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class UserServiceClient {

    private static final Logger log = LoggerFactory.getLogger(UserServiceClient.class);

    private final RabbitTemplate rabbitTemplate;
    private final String exchange;
    private final String routingKey;

    public UserServiceClient(
            RabbitTemplate rabbitTemplate,
            @Value("${app.notifications.exchange}") String exchange,
            @Value("${app.notifications.routing-key}") String routingKey) {
        this.rabbitTemplate = rabbitTemplate;
        this.exchange = exchange;
        this.routingKey = routingKey;
    }

    public void sendNotification(UUID userId, String title, String message, String type, String link, String data) {
        sendNotification(userId, title, message, type, link, data, null);
    }

    public void sendNotification(UUID userId, String title, String message, String type, String link, String data, UUID actorUserId) {
        try {
            NotificationMessage msg = new NotificationMessage(
                    userId, title, message, type,
                    link != null ? link : "",
                    data != null ? data : "",
                    actorUserId
            );
            rabbitTemplate.convertAndSend(exchange, routingKey, msg);
        } catch (Exception e) {
            log.error("Failed to publish notification to user {}: {}", userId, e.getMessage());
        }
    }
}