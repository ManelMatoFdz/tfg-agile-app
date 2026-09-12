package com.tfg.agile.app.project_service.controller;

import com.github.tomakehurst.wiremock.WireMockServer;
import com.tfg.agile.app.project_service.entity.Category;
import com.tfg.agile.app.project_service.entity.Project;
import com.tfg.agile.app.project_service.entity.Team;
import com.tfg.agile.app.project_service.entity.Workspace;
import com.tfg.agile.app.project_service.entity.WorkspaceMember;
import com.tfg.agile.app.project_service.entity.WorkspaceRole;
import com.tfg.agile.app.project_service.repository.CategoryRepository;
import com.tfg.agile.app.project_service.repository.ProjectRepository;
import com.tfg.agile.app.project_service.repository.TeamRepository;
import com.tfg.agile.app.project_service.repository.WorkspaceMemberRepository;
import com.tfg.agile.app.project_service.repository.WorkspaceRepository;
import com.tfg.agile.app.project_service.support.IntegrationTestBase;
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

import java.util.UUID;

import static com.github.tomakehurst.wiremock.client.WireMock.aResponse;
import static com.github.tomakehurst.wiremock.client.WireMock.delete;
import static com.github.tomakehurst.wiremock.client.WireMock.deleteRequestedFor;
import static com.github.tomakehurst.wiremock.client.WireMock.equalTo;
import static com.github.tomakehurst.wiremock.client.WireMock.get;
import static com.github.tomakehurst.wiremock.client.WireMock.urlEqualTo;
import static com.github.tomakehurst.wiremock.client.WireMock.urlMatching;
import static com.github.tomakehurst.wiremock.core.WireMockConfiguration.wireMockConfig;
import static org.assertj.core.api.Assertions.assertThat;

class ProjectDeletionCleanupWireMockIT extends IntegrationTestBase {

    private static final WireMockServer taskService = new WireMockServer(wireMockConfig().dynamicPort());
    private static final WireMockServer pokerService = new WireMockServer(wireMockConfig().dynamicPort());
    private static final WireMockServer userService = new WireMockServer(wireMockConfig().dynamicPort());

    static {
        taskService.start();
        pokerService.start();
        userService.start();
    }

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry registry) {
        registry.add("app.task-service.url", taskService::baseUrl);
        registry.add("app.poker-service.url", pokerService::baseUrl);
        registry.add("app.user-service.url", userService::baseUrl);
    }

    @AfterAll
    static void stopWireMock() {
        taskService.stop();
        pokerService.stop();
        userService.stop();
    }

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private WorkspaceRepository workspaceRepository;

    @Autowired
    private WorkspaceMemberRepository workspaceMemberRepository;

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private TeamRepository teamRepository;

    @BeforeEach
    void setUp() {
        taskService.resetAll();
        pokerService.resetAll();
        userService.resetAll();
        userService.stubFor(get(urlMatching("/internal/users/.*/token-version"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody("{\"tokenVersion\":0}")));
    }

    @Test
    void deleteProjectCleansTaskAndPokerDataBeforeRemovingProject() {
        UUID callerId = UUID.randomUUID();
        Workspace workspace = saveWorkspaceWithAdmin(callerId);
        Project project = projectRepository.save(Project.builder()
                .workspace(workspace)
                .name("API")
                .description("Backend")
                .build());
        stubCleanup(project.getId(), HttpStatus.NO_CONTENT, HttpStatus.NO_CONTENT);

        ResponseEntity<Void> response = restTemplate.exchange(
                "/projects/{projectId}",
                HttpMethod.DELETE,
                new HttpEntity<>(authHeaders(callerId)),
                Void.class,
                project.getId()
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(projectRepository.findById(project.getId())).isEmpty();
        verifyCleanupRequested(project.getId(), taskService);
        verifyCleanupRequested(project.getId(), pokerService);
    }

    @Test
    void deleteProjectKeepsProjectWhenRemoteCleanupFails() {
        UUID callerId = UUID.randomUUID();
        Workspace workspace = saveWorkspaceWithAdmin(callerId);
        Project project = projectRepository.save(Project.builder()
                .workspace(workspace)
                .name("API")
                .description("Backend")
                .build());
        stubCleanup(project.getId(), HttpStatus.INTERNAL_SERVER_ERROR, HttpStatus.NO_CONTENT);

        ResponseEntity<String> response = restTemplate.exchange(
                "/projects/{projectId}",
                HttpMethod.DELETE,
                new HttpEntity<>(authHeaders(callerId)),
                String.class,
                project.getId()
        );

        assertThat(response.getStatusCode().isError()).isTrue();
        assertThat(projectRepository.findById(project.getId())).isPresent();
        verifyCleanupRequested(project.getId(), taskService);
        verifyCleanupRequested(project.getId(), pokerService);
    }

    @Test
    void deleteWorkspaceCleansProjectsBeforeRemovingProjectScopedRecords() {
        UUID callerId = UUID.randomUUID();
        Workspace workspace = saveWorkspaceWithAdmin(callerId);
        Category category = categoryRepository.save(Category.builder()
                .workspace(workspace)
                .name("Backend")
                .color("#3366FF")
                .position(1)
                .build());
        Team team = teamRepository.save(Team.builder()
                .workspace(workspace)
                .name("Team A")
                .description("Core team")
                .build());
        Project project = projectRepository.save(Project.builder()
                .workspace(workspace)
                .category(category)
                .team(team)
                .name("API")
                .description("Backend")
                .build());
        stubCleanup(project.getId(), HttpStatus.NO_CONTENT, HttpStatus.NO_CONTENT);

        ResponseEntity<Void> response = restTemplate.exchange(
                "/workspaces/{workspaceId}",
                HttpMethod.DELETE,
                new HttpEntity<>(authHeaders(callerId)),
                Void.class,
                workspace.getId()
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(projectRepository.findById(project.getId())).isEmpty();
        assertThat(teamRepository.findById(team.getId())).isEmpty();
        assertThat(categoryRepository.findById(category.getId())).isEmpty();
        assertThat(workspaceRepository.findById(workspace.getId())).isEmpty();
        verifyCleanupRequested(project.getId(), taskService);
        verifyCleanupRequested(project.getId(), pokerService);
    }

    private Workspace saveWorkspaceWithAdmin(UUID callerId) {
        Workspace workspace = workspaceRepository.save(Workspace.builder()
                .name("Acme")
                .description("Main workspace")
                .ownerId(callerId)
                .build());
        workspaceMemberRepository.save(WorkspaceMember.builder()
                .workspace(workspace)
                .userId(callerId)
                .role(WorkspaceRole.ADMIN)
                .build());
        return workspace;
    }

    private void stubCleanup(UUID projectId, HttpStatus taskStatus, HttpStatus pokerStatus) {
        taskService.stubFor(delete(urlEqualTo("/internal/projects/" + projectId + "/data"))
                .willReturn(aResponse().withStatus(taskStatus.value())));
        pokerService.stubFor(delete(urlEqualTo("/internal/projects/" + projectId + "/data"))
                .willReturn(aResponse().withStatus(pokerStatus.value())));
    }

    private void verifyCleanupRequested(UUID projectId, WireMockServer server) {
        server.verify(deleteRequestedFor(urlEqualTo("/internal/projects/" + projectId + "/data"))
                .withHeader("X-Internal-Api-Key", equalTo("test-internal-key")));
    }

    private HttpHeaders authHeaders(UUID callerId) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(jwtFor(callerId));
        return headers;
    }
}
