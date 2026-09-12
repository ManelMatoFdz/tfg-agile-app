package com.tfg.agile.app.poker_service.client;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class UserServiceClientTest {

    private static final String EXCHANGE = "agileflow.notifications";
    private static final String ROUTING_KEY = "user-service.notification";

    @Test
    void sendNotification_publishesToRabbitMQ() {
        RabbitTemplate rabbitTemplate = mock(RabbitTemplate.class);
        UserServiceClient client = new UserServiceClient(rabbitTemplate, EXCHANGE, ROUTING_KEY);

        UUID userId = UUID.randomUUID();
        client.sendNotification(userId, "Title", "Message", "TYPE", "/link", null);

        ArgumentCaptor<NotificationMessage> captor = ArgumentCaptor.forClass(NotificationMessage.class);
        verify(rabbitTemplate).convertAndSend(eq(EXCHANGE), eq(ROUTING_KEY), captor.capture());

        NotificationMessage msg = captor.getValue();
        assertThat(msg.getUserId()).isEqualTo(userId);
        assertThat(msg.getTitle()).isEqualTo("Title");
        assertThat(msg.getType()).isEqualTo("TYPE");
    }

    @Test
    void sendNotification_doesNotThrowOnError() {
        RabbitTemplate rabbitTemplate = mock(RabbitTemplate.class);
        doThrow(new RuntimeException("connection refused"))
                .when(rabbitTemplate).convertAndSend(anyString(), anyString(), any(NotificationMessage.class));

        UserServiceClient client = new UserServiceClient(rabbitTemplate, EXCHANGE, ROUTING_KEY);

        assertThatCode(() -> client.sendNotification(
                UUID.randomUUID(), "Title", "Message", "TYPE", "/link", null
        )).doesNotThrowAnyException();
    }
}