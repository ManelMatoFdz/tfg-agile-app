package com.tfg.agile.app.user_service.service;

import com.tfg.agile.app.user_service.dto.NotificationEnqueueRequestDto;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class NotificationIngressService {

    private final NotificationProcessingService notificationProcessingService;
    private final NotificationQueuePublisher notificationQueuePublisher;
    private final boolean queueEnabled;

    public NotificationIngressService(
            NotificationProcessingService notificationProcessingService,
            ObjectProvider<NotificationQueuePublisher> notificationQueuePublisherProvider,
            @Value("${app.notifications.queue.enabled:false}") boolean queueEnabled
    ) {
        this.notificationProcessingService = notificationProcessingService;
        this.notificationQueuePublisher = notificationQueuePublisherProvider.getIfAvailable();
        this.queueEnabled = queueEnabled;
    }

    public void enqueue(NotificationEnqueueRequestDto requestDto) {
        NotificationQueueMessage message = NotificationQueueMessage.fromRequest(requestDto);

        if (!queueEnabled || notificationQueuePublisher == null) {
            notificationProcessingService.process(message);
            return;
        }

        notificationQueuePublisher.publish(message);
    }
}
