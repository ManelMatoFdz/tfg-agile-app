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

class ProjectServiceClientTest {

    private HttpServer server;

    @AfterEach
    void tearDown() {
        if (server != null) {
            server.stop(0);
        }
    }

    @Test
    void getMemberIds_sendsGetRequest() throws IOException {
        UUID projectId = UUID.randomUUID();
        AtomicBoolean received = new AtomicBoolean(false);

        server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/internal/projects/" + projectId + "/member-ids", exchange -> {
            if ("GET".equals(exchange.getRequestMethod())) {
                received.set(true);
                String responseBody = """
                        {"workspaceId":"%s","memberUserIds":["%s"]}
                        """.formatted(UUID.randomUUID(), UUID.randomUUID());
                byte[] bytes = responseBody.getBytes();
                exchange.getResponseHeaders().add("Content-Type", "application/json");
                exchange.sendResponseHeaders(200, bytes.length);
                exchange.getResponseBody().write(bytes);
            } else {
                exchange.sendResponseHeaders(405, -1);
            }
            exchange.close();
        });
        server.start();

        String baseUrl = "http://localhost:" + server.getAddress().getPort();
        ProjectServiceClient client = new ProjectServiceClient(baseUrl, "internal-key");

        var result = client.getMemberIds(projectId);

        assertThat(received.get()).isTrue();
        assertThat(result).isNotNull();
        assertThat(result.memberUserIds()).hasSize(1);
    }

    @Test
    void getMemberIds_returnsNullOnError() {
        ProjectServiceClient client = new ProjectServiceClient("http://localhost:9", "internal-key");

        var result = client.getMemberIds(UUID.randomUUID());

        assertThat(result).isNull();
    }
}