package com.tfg.agile.app.project_service.controller;

import com.tfg.agile.app.project_service.entity.Project;
import com.tfg.agile.app.project_service.entity.Workspace;
import com.tfg.agile.app.project_service.entity.WorkspaceMember;
import com.tfg.agile.app.project_service.entity.WorkspaceRole;
import com.tfg.agile.app.project_service.repository.ProjectRepository;
import com.tfg.agile.app.project_service.repository.WorkspaceMemberRepository;
import com.tfg.agile.app.project_service.repository.WorkspaceRepository;
import com.tfg.agile.app.project_service.support.IntegrationTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.Duration;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class WorkspaceControllerIT extends IntegrationTestBase {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private WorkspaceRepository workspaceRepository;

    @Autowired
    private WorkspaceMemberRepository workspaceMemberRepository;

    @Autowired
    private ProjectRepository projectRepository;

    @Test
    void createWorkspaceRequiresJwt() {
        ResponseEntity<String> response = restTemplate.postForEntity(
                "/workspaces",
                Map.of("name", "Platform", "description", "Workspace"),
                String.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void createWorkspacePersistsWorkspaceAndAdminMembership() {
        UUID callerId = UUID.randomUUID();
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(jwtFor(callerId));

        ResponseEntity<Map> response = restTemplate.exchange(
                "/workspaces",
                HttpMethod.POST,
                new HttpEntity<>(Map.of("name", "Platform", "description", "Workspace"), headers),
                Map.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        UUID workspaceId = UUID.fromString(response.getBody().get("id").toString());
        assertThat(workspaceRepository.findById(workspaceId))
                .get()
                .extracting(Workspace::getName, Workspace::getDescription, Workspace::getOwnerId)
                .containsExactly("Platform", "Workspace", callerId);
        assertThat(workspaceMemberRepository.findByUserId(callerId))
                .singleElement()
                .extracting(WorkspaceMember::getRole)
                .isEqualTo(WorkspaceRole.ADMIN);
    }

    @Test
    void internalTouchProjectAcceptsInternalApiKeyAndUpdatesTimestamp() throws InterruptedException {
        Workspace workspace = workspaceRepository.save(Workspace.builder()
                .name("Acme")
                .description("Workspace")
                .ownerId(UUID.randomUUID())
                .build());
        Project project = projectRepository.save(Project.builder()
                .workspace(workspace)
                .name("Kadenza")
                .description("Repo")
                .build());
        var before = project.getUpdatedAt();
        Thread.sleep(Duration.ofMillis(20));

        HttpHeaders headers = new HttpHeaders();
        headers.add("X-Internal-Api-Key", "test-internal-key");

        ResponseEntity<Void> response = restTemplate.exchange(
                "/internal/projects/{projectId}/touch",
                HttpMethod.POST,
                new HttpEntity<>(headers),
                Void.class,
                project.getId()
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(projectRepository.findById(project.getId())).get()
                .extracting(Project::getUpdatedAt)
                .asInstanceOf(org.assertj.core.api.InstanceOfAssertFactories.INSTANT)
                .isAfter(before);
    }
}
