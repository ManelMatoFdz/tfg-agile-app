package com.tfg.agile.app.poker_service.client;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

class TaskServiceClientTest {

    private HttpServer server;

    @AfterEach
    void tearDown() {
        if (server != null) {
            server.stop(0);
        }
    }

    @Test
    void updateStoryPoints_sendsPutRequest() throws IOException {
        UUID taskId = UUID.randomUUID();
        AtomicBoolean received = new AtomicBoolean(false);

        server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/internal/tasks/" + taskId + "/story-points", exchange -> {
            if ("PUT".equals(exchange.getRequestMethod())) {
                String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
                if (body.contains("storyPoints")) {
                    received.set(true);
                }
                exchange.sendResponseHeaders(204, -1);
            } else {
                exchange.sendResponseHeaders(405, -1);
            }
            exchange.close();
        });
        server.start();

        String baseUrl = "http://localhost:" + server.getAddress().getPort();
        TaskServiceClient client = new TaskServiceClient(baseUrl, "internal-key");

        client.updateStoryPoints(taskId, 8);

        assertThat(received.get()).isTrue();
    }

    @Test
    void updateStoryPoints_handlesErrors() {
        TaskServiceClient client = new TaskServiceClient("http://localhost:9", "internal-key");

        assertThatCode(() -> client.updateStoryPoints(UUID.randomUUID(), 5)).doesNotThrowAnyException();
    }
}

