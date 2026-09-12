package com.tfg.agile.app.poker_service.client;

import com.sun.net.httpserver.HttpServer;
import com.tfg.agile.app.poker_service.exception.ForbiddenException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;

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

    @Test
    void getMemberPermissions_returnsPermissionsOnSuccess() throws IOException {
        UUID projectId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID workspaceId = UUID.randomUUID();

        server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/internal/projects/" + projectId + "/members/" + userId + "/permissions", exchange -> {
            if ("GET".equals(exchange.getRequestMethod())) {
                String responseBody = """
                        {"workspaceId":"%s","workspaceAdmin":false,"teamAdmin":false,"projectMember":true,"scrumRole":"PRODUCT_OWNER"}
                        """.formatted(workspaceId);
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

        var result = client.getMemberPermissions(projectId, userId);

        assertThat(result.workspaceId()).isEqualTo(workspaceId);
        assertThat(result.projectMember()).isTrue();
        assertThat(result.scrumRole()).isEqualTo("PRODUCT_OWNER");
    }

    @Test
    void getMemberPermissions_maps404ToForbiddenException() throws IOException {
        UUID projectId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/internal/projects/" + projectId + "/members/" + userId + "/permissions", exchange -> {
            exchange.sendResponseHeaders(404, -1);
            exchange.close();
        });
        server.start();

        String baseUrl = "http://localhost:" + server.getAddress().getPort();
        ProjectServiceClient client = new ProjectServiceClient(baseUrl, "internal-key");

        assertThatThrownBy(() -> client.getMemberPermissions(projectId, userId))
                .isInstanceOf(ForbiddenException.class)
                .hasMessage("NOT_PROJECT_MEMBER");
    }

}