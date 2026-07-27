package com.tfg.agile.app.poker_service.client;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

class UserServiceClientTest {

    private HttpServer server;

    @AfterEach
    void tearDown() {
        if (server != null) {
            server.stop(0);
        }
    }

    @Test
    void sendNotification_sendsPostRequest() throws IOException {
        AtomicBoolean received = new AtomicBoolean(false);

        server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/internal/notifications/enqueue", exchange -> {
            if ("POST".equals(exchange.getRequestMethod())) {
                received.set(true);
                exchange.sendResponseHeaders(204, -1);
            } else {
                exchange.sendResponseHeaders(405, -1);
            }
            exchange.close();
        });
        server.start();

        String baseUrl = "http://localhost:" + server.getAddress().getPort();
        UserServiceClient client = new UserServiceClient(baseUrl, "internal-key");

        client.sendNotification(UUID.randomUUID(), "Title", "Message", "TYPE", "/link", null);

        assertThat(received.get()).isTrue();
    }

    @Test
    void sendNotification_doesNotThrowOnError() {
        UserServiceClient client = new UserServiceClient("http://localhost:9", "internal-key");

        assertThatCode(() -> client.sendNotification(
                UUID.randomUUID(), "Title", "Message", "TYPE", "/link", null
        )).doesNotThrowAnyException();
    }
}