package com.tfg.agile.app.task_service.config;

import org.junit.jupiter.api.Test;
import org.springframework.amqp.core.TopicExchange;

import static org.assertj.core.api.Assertions.assertThat;

class NotificationRabbitConfigTest {

    private final NotificationRabbitConfig config = new NotificationRabbitConfig();

    @Test
    void notificationsExchange_createsDurableNonAutoDeleteExchange() {
        TopicExchange exchange = config.notificationsExchange("agileflow.notifications");

        assertThat(exchange.getName()).isEqualTo("agileflow.notifications");
        assertThat(exchange.isDurable()).isTrue();
        assertThat(exchange.isAutoDelete()).isFalse();
    }
}
