package com.tfg.agile.app.task_service.client;

import com.sun.net.httpserver.HttpServer;
import com.tfg.agile.app.task_service.exception.ForbiddenException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ProjectServiceClientTest {

    private HttpServer server;

    @AfterEach
    void tearDown() {
        if (server != null) {
            server.stop(0);
        }
    }

    @Test
    void getMemberPermissions_returnsPermissionsOnSuccess() throws IOException {
        server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/internal/projects", exchange -> {
            String response = "{\"role\":\"ADMIN\",\"scrumRole\":\"SCRUM_MASTER\"}";
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, response.getBytes(StandardCharsets.UTF_8).length);
            exchange.getResponseBody().write(response.getBytes(StandardCharsets.UTF_8));
            exchange.close();
        });
        server.start();

        String baseUrl = "http://localhost:" + server.getAddress().getPort();
        ProjectServiceClient client = new ProjectServiceClient(baseUrl, "internal-key");

        MemberPermissionsDto response = client.getMemberPermissions(UUID.randomUUID(), UUID.randomUUID());

        assertThat(response.role()).isEqualTo("ADMIN");
        assertThat(response.scrumRole()).isEqualTo("SCRUM_MASTER");
    }

    @Test
    void getMemberPermissions_maps404ToForbiddenException() throws IOException {
        server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/internal/projects", exchange -> {
            exchange.sendResponseHeaders(404, -1);
            exchange.close();
        });
        server.start();

        String baseUrl = "http://localhost:" + server.getAddress().getPort();
        ProjectServiceClient client = new ProjectServiceClient(baseUrl, "internal-key");

        assertThatThrownBy(() -> client.getMemberPermissions(UUID.randomUUID(), UUID.randomUUID()))
                .isInstanceOf(ForbiddenException.class)
                .hasMessage("Not a member of this project");
    }
}

