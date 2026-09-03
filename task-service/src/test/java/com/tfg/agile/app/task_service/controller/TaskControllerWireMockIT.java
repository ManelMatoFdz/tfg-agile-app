package com.tfg.agile.app.task_service.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.tomakehurst.wiremock.WireMockServer;
import com.tfg.agile.app.task_service.entity.Task;
import com.tfg.agile.app.task_service.repository.TaskActivityRepository;
import com.tfg.agile.app.task_service.repository.TaskRepository;
import com.tfg.agile.app.task_service.support.IntegrationTestBase;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.util.Map;
import java.util.UUID;

import static com.github.tomakehurst.wiremock.client.WireMock.aResponse;
import static com.github.tomakehurst.wiremock.client.WireMock.equalTo;
import static com.github.tomakehurst.wiremock.client.WireMock.get;
import static com.github.tomakehurst.wiremock.client.WireMock.getRequestedFor;
import static com.github.tomakehurst.wiremock.client.WireMock.matchingJsonPath;
import static com.github.tomakehurst.wiremock.client.WireMock.post;
import static com.github.tomakehurst.wiremock.client.WireMock.postRequestedFor;
import static com.github.tomakehurst.wiremock.client.WireMock.urlEqualTo;
import static com.github.tomakehurst.wiremock.core.WireMockConfiguration.wireMockConfig;
import static org.assertj.core.api.Assertions.assertThat;

class TaskControllerWireMockIT extends IntegrationTestBase {

    private static final WireMockServer wireMock = new WireMockServer(wireMockConfig().dynamicPort());

    static {
        wireMock.start();
    }

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry registry) {
        registry.add("app.project-service.url", wireMock::baseUrl);
        registry.add("app.user-service.url", wireMock::baseUrl);
    }

    @AfterAll
    static void stopWireMock() {
        wireMock.stop();
    }

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private TaskActivityRepository taskActivityRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        wireMock.resetAll();
    }

    @Test
    void createTaskPersistsAndCallsProjectAndUserServices() throws Exception {
        UUID projectId = UUID.randomUUID();
        UUID callerId = UUID.randomUUID();
        UUID assigneeId = UUID.randomUUID();
        UUID workspaceId = UUID.randomUUID();

        wireMock.stubFor(get(urlEqualTo("/internal/projects/" + projectId + "/members/" + callerId + "/permissions"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody("""
                                {
                                  "workspaceId":"%s",
                                  "workspaceAdmin":true,
                                  "teamAdmin":false,
                                  "scrumRole":"PRODUCT_OWNER"
                                }
                                """.formatted(workspaceId))));
        wireMock.stubFor(post(urlEqualTo("/internal/projects/" + projectId + "/touch"))
                .willReturn(aResponse().withStatus(204)));
        wireMock.stubFor(post(urlEqualTo("/internal/projects/" + projectId + "/members/" + callerId + "/touch"))
                .willReturn(aResponse().withStatus(204)));
        wireMock.stubFor(post(urlEqualTo("/internal/notifications/enqueue"))
                .willReturn(aResponse().withStatus(200)));

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(jwtFor(callerId));

        ResponseEntity<Map> response = restTemplate.exchange(
                "/projects/{projectId}/tasks",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(
                        "title", "Implement repository page",
                        "description", "Create repository dashboard",
                        "priority", "HIGH",
                        "type", "TASK",
                        "assigneeId", assigneeId
                ), headers),
                Map.class,
                projectId
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(taskRepository.findAll())
                .singleElement()
                .extracting(Task::getProjectId, Task::getTitle, Task::getAssigneeId, Task::getStatus)
                .containsExactly(projectId, "Implement repository page", assigneeId, "TODO");
        assertThat(taskActivityRepository.findAll()).hasSize(1);

        wireMock.verify(getRequestedFor(urlEqualTo("/internal/projects/" + projectId + "/members/" + callerId + "/permissions"))
                .withHeader("X-Internal-Api-Key", equalTo("test-internal-key")));
        wireMock.verify(postRequestedFor(urlEqualTo("/internal/projects/" + projectId + "/touch"))
                .withHeader("X-Internal-Api-Key", equalTo("test-internal-key")));
        wireMock.verify(postRequestedFor(urlEqualTo("/internal/projects/" + projectId + "/members/" + callerId + "/touch"))
                .withHeader("X-Internal-Api-Key", equalTo("test-internal-key")));
        wireMock.verify(postRequestedFor(urlEqualTo("/internal/notifications/enqueue"))
                .withHeader("X-Internal-Api-Key", equalTo("test-internal-key"))
                .withRequestBody(matchingJsonPath("$.userId", equalTo(assigneeId.toString())))
                .withRequestBody(matchingJsonPath("$.type", equalTo("TASK_REMINDER")))
                .withRequestBody(matchingJsonPath("$.actorUserId", equalTo(callerId.toString()))));

        String notificationBody = wireMock.getServeEvents().getServeEvents().stream()
                .filter(event -> event.getRequest().getUrl().equals("/internal/notifications/enqueue"))
                .findFirst()
                .orElseThrow()
                .getRequest()
                .getBodyAsString();
        JsonNode payload = objectMapper.readTree(notificationBody);
        assertThat(payload.path("link").asText()).isEqualTo("/workspaces/" + workspaceId + "/projects/" + projectId + "/board");
        assertThat(payload.path("message").asText()).contains("Implement repository page");
    }
}
