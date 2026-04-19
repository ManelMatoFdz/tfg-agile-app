package com.tfg.agile.app.user_service.service;

import org.junit.jupiter.api.Test;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;

import static org.assertj.core.api.Assertions.assertThat;

class NotificationQueueConfigTest {

    private final NotificationQueueConfig config = new NotificationQueueConfig();

    @Test
    void notificationsExchange_createsDurableNonAutoDeleteExchange() {
        TopicExchange exchange = config.notificationsExchange("agileflow.notifications");

        assertThat(exchange.getName()).isEqualTo("agileflow.notifications");
        assertThat(exchange.isDurable()).isTrue();
        assertThat(exchange.isAutoDelete()).isFalse();
    }

    @Test
    void notificationsQueue_createsDurableQueue() {
        Queue queue = config.notificationsQueue("user-service.notifications");

        assertThat(queue.getName()).isEqualTo("user-service.notifications");
        assertThat(queue.isDurable()).isTrue();
    }

    @Test
    void notificationsBinding_bindsQueueToExchangeWithRoutingKey() {
        Queue queue = config.notificationsQueue("user-service.notifications");
        TopicExchange exchange = config.notificationsExchange("agileflow.notifications");

        Binding binding = config.notificationsBinding(queue, exchange, "user-service.notification");

        assertThat(binding.getDestination()).isEqualTo("user-service.notifications");
        assertThat(binding.getExchange()).isEqualTo("agileflow.notifications");
        assertThat(binding.getRoutingKey()).isEqualTo("user-service.notification");
    }
}

