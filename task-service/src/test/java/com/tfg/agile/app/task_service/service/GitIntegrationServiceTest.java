package com.tfg.agile.app.task_service.service;

import com.tfg.agile.app.task_service.client.ProjectServiceClient;
import com.tfg.agile.app.task_service.dto.GitEventDto;
import com.tfg.agile.app.task_service.dto.GitIntegrationDto;
import com.tfg.agile.app.task_service.dto.LinkGitEventRequestDto;
import com.tfg.agile.app.task_service.dto.SetupGitIntegrationRequestDto;
import com.tfg.agile.app.task_service.entity.GitEvent;
import com.tfg.agile.app.task_service.entity.GitEventType;
import com.tfg.agile.app.task_service.entity.GitIntegration;
import com.tfg.agile.app.task_service.entity.Task;
import com.tfg.agile.app.task_service.exception.ForbiddenException;
import com.tfg.agile.app.task_service.exception.ResourceNotFoundException;
import com.tfg.agile.app.task_service.repository.GitEventRepository;
import com.tfg.agile.app.task_service.repository.GitIntegrationRepository;
import com.tfg.agile.app.task_service.repository.TaskRepository;
import com.tfg.agile.app.task_service.support.TestDataFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GitIntegrationServiceTest {

    private static final String BASE_URL = "https://api.example.com";

    @Mock
    private GitIntegrationRepository integrationRepository;
    @Mock
    private GitEventRepository gitEventRepository;
    @Mock
    private TaskRepository taskRepository;
    @Mock
    private ProjectServiceClient projectServiceClient;

    private GitIntegrationService service;

    @BeforeEach
    void setUp() {
        service = new GitIntegrationService(integrationRepository, gitEventRepository, taskRepository,
                projectServiceClient, BASE_URL);
    }

    // ── setup ────────────────────────────────────────────────────────────────

    @Test
    void setup_generatesSecretAndReturnsWebhookUrl() {
        UUID projectId = UUID.randomUUID();
        UUID callerId = UUID.randomUUID();
        when(projectServiceClient.getMemberPermissions(projectId, callerId))
                .thenReturn(TestDataFactory.adminPermissions());
        when(integrationRepository.findByProjectId(projectId)).thenReturn(Optional.empty());
        when(integrationRepository.save(any(GitIntegration.class))).thenAnswer(inv -> inv.getArgument(0));

        GitIntegrationDto dto = service.setup(projectId,
                new SetupGitIntegrationRequestDto("  https://github.com/org/repo  "), callerId);

        assertThat(dto.repositoryUrl()).isEqualTo("https://github.com/org/repo");
        assertThat(dto.webhookUrl()).isEqualTo(BASE_URL + "/webhooks/github/" + projectId);
        assertThat(dto.webhookSecret()).hasSize(64);
    }

    @Test
    void setup_throwsForNonAdmin() {
        UUID projectId = UUID.randomUUID();
        UUID callerId = UUID.randomUUID();
        when(projectServiceClient.getMemberPermissions(projectId, callerId))
                .thenReturn(TestDataFactory.memberPermissions());

        SetupGitIntegrationRequestDto dto = new SetupGitIntegrationRequestDto("https://github.com/org/repo");
        assertThatThrownBy(() -> service.setup(projectId, dto, callerId))
                .isInstanceOf(ForbiddenException.class)
                .hasMessage("ONLY_ADMIN_CAN_MANAGE_GIT_INTEGRATION");
    }

    @Test
    void getConfig_neverExposesSecret() {
        UUID projectId = UUID.randomUUID();
        UUID callerId = UUID.randomUUID();
        when(projectServiceClient.getMemberPermissions(projectId, callerId))
                .thenReturn(TestDataFactory.memberPermissions());
        when(integrationRepository.findByProjectId(projectId)).thenReturn(Optional.of(
                GitIntegration.builder()
                        .projectId(projectId)
                        .repositoryUrl("https://github.com/org/repo")
                        .webhookSecret("plaintext-secret")
                        .build()));

        GitIntegrationDto dto = service.getConfig(projectId, callerId);

        assertThat(dto).isNotNull();
        assertThat(dto.webhookSecret()).isNull();
    }

    @Test
    void getConfig_returnsNullWhenNotConfigured() {
        UUID projectId = UUID.randomUUID();
        UUID callerId = UUID.randomUUID();
        when(projectServiceClient.getMemberPermissions(projectId, callerId))
                .thenReturn(TestDataFactory.memberPermissions());
        when(integrationRepository.findByProjectId(projectId)).thenReturn(Optional.empty());

        assertThat(service.getConfig(projectId, callerId)).isNull();
    }

    @Test
    void disconnect_removesEventsAndIntegration() {
        UUID projectId = UUID.randomUUID();
        UUID callerId = UUID.randomUUID();
        GitIntegration integration = GitIntegration.builder().projectId(projectId).build();
        when(projectServiceClient.getMemberPermissions(projectId, callerId))
                .thenReturn(TestDataFactory.teamAdminPermissions());
        when(integrationRepository.findByProjectId(projectId)).thenReturn(Optional.of(integration));

        service.disconnect(projectId, callerId);

        verify(gitEventRepository).deleteByProjectId(projectId);
        verify(integrationRepository).delete(integration);
    }

    // ── vinculacion manual ───────────────────────────────────────────────────

    @Test
    void linkManually_recognisesCommitUrl() {
        Task task = givenTask();
        when(gitEventRepository.findByProjectIdAndTypeAndExternalId(
                task.getProjectId(), GitEventType.COMMIT, "abc1234"))
                .thenReturn(Optional.empty());
        when(gitEventRepository.save(any(GitEvent.class))).thenAnswer(inv -> inv.getArgument(0));

        GitEventDto dto = service.linkManually(task.getId(),
                new LinkGitEventRequestDto("https://github.com/org/repo/commit/abc1234", null),
                UUID.randomUUID());

        assertThat(dto.type()).isEqualTo(GitEventType.COMMIT);
        assertThat(dto.externalId()).isEqualTo("abc1234");
        assertThat(dto.taskId()).isEqualTo(task.getId());
        assertThat(dto.title()).isEqualTo("abc1234");
    }

    @Test
    void linkManually_recognisesPullRequestUrlAndCustomTitle() {
        Task task = givenTask();
        when(gitEventRepository.findByProjectIdAndTypeAndExternalId(
                task.getProjectId(), GitEventType.PULL_REQUEST, "42"))
                .thenReturn(Optional.empty());
        when(gitEventRepository.save(any(GitEvent.class))).thenAnswer(inv -> inv.getArgument(0));

        GitEventDto dto = service.linkManually(task.getId(),
                new LinkGitEventRequestDto("https://github.com/org/repo/pull/42", "  Add login  "),
                UUID.randomUUID());

        assertThat(dto.type()).isEqualTo(GitEventType.PULL_REQUEST);
        assertThat(dto.externalId()).isEqualTo("42");
        assertThat(dto.title()).isEqualTo("Add login");
    }

    @Test
    void linkManually_throwsForUnrecognisedUrl() {
        Task task = givenTask();
        LinkGitEventRequestDto dto = new LinkGitEventRequestDto("https://github.com/org/repo", null);
        UUID callerId = UUID.randomUUID();

        assertThatThrownBy(() -> service.linkManually(task.getId(), dto, callerId))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("UNRECOGNIZED_GIT_URL");
    }

    @Test
    void unlink_throwsWhenEventBelongsToAnotherTask() {
        Task task = givenTask();
        GitEvent event = GitEvent.builder()
                .id(UUID.randomUUID())
                .projectId(task.getProjectId())
                .taskId(UUID.randomUUID())
                .type(GitEventType.COMMIT)
                .externalId("abc1234")
                .build();
        when(gitEventRepository.findById(event.getId())).thenReturn(Optional.of(event));
        UUID callerId = UUID.randomUUID();

        assertThatThrownBy(() -> service.unlink(task.getId(), event.getId(), callerId))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("GIT_EVENT_NOT_FOUND");
    }

    @Test
    void unlink_deletesEventOfTheTask() {
        Task task = givenTask();
        GitEvent event = GitEvent.builder()
                .id(UUID.randomUUID())
                .projectId(task.getProjectId())
                .taskId(task.getId())
                .type(GitEventType.COMMIT)
                .externalId("abc1234")
                .build();
        when(gitEventRepository.findById(event.getId())).thenReturn(Optional.of(event));

        service.unlink(task.getId(), event.getId(), UUID.randomUUID());

        verify(gitEventRepository).delete(event);
    }

    private Task givenTask() {
        Task task = TestDataFactory.task(UUID.randomUUID(), UUID.randomUUID());
        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));
        when(projectServiceClient.getMemberPermissions(any(), any()))
                .thenReturn(TestDataFactory.memberPermissions());
        return task;
    }
}
