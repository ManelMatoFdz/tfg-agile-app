package com.tfg.agile.app.user_service.service;

import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(prefix = "app.notifications.queue", name = "enabled", havingValue = "true")
public class NotificationQueueListener {

    private final NotificationProcessingService notificationProcessingService;

    public NotificationQueueListener(NotificationProcessingService notificationProcessingService) {
        this.notificationProcessingService = notificationProcessingService;
    }

    @RabbitListener(queues = "${app.notifications.queue.name:user-service.notifications}")
    public void onMessage(NotificationQueueMessage message) {
        notificationProcessingService.process(message);
    }
}
