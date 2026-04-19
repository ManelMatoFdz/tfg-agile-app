package com.tfg.agile.app.user_service.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class NotificationQueuePublisherTest {

    @Mock
    private RabbitTemplate rabbitTemplate;

    @Test
    void publish_sendsMessageWithConfiguredExchangeAndRoutingKey() {
        NotificationQueuePublisher publisher = new NotificationQueuePublisher(
                rabbitTemplate,
                "agileflow.notifications",
                "user-service.notification"
        );
        NotificationQueueMessage message = new NotificationQueueMessage();

        publisher.publish(message);

        verify(rabbitTemplate).convertAndSend("agileflow.notifications", "user-service.notification", message);
    }
}

