package com.tfg.agile.app.task_service.service;

import com.tfg.agile.app.task_service.client.ProjectServiceClient;
import com.tfg.agile.app.task_service.client.UserServiceClient;
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
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import tools.jackson.databind.ObjectMapper;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class GitWebhookServiceTest {

    private static final String SECRET = "topsecret";

    @Mock
    private GitIntegrationRepository integrationRepository;
    @Mock
    private GitEventRepository gitEventRepository;
    @Mock
    private TaskRepository taskRepository;
    @Mock
    private ProjectServiceClient projectServiceClient;
    @Mock
    private UserServiceClient userServiceClient;

    private GitWebhookService service;

    private UUID projectId;
    private Task task;

    @BeforeEach
    void setUp() {
        service = new GitWebhookService(integrationRepository, gitEventRepository, taskRepository,
                projectServiceClient, userServiceClient, new ObjectMapper());

        projectId = UUID.randomUUID();
        task = TestDataFactory.task(projectId, UUID.randomUUID());

        when(integrationRepository.findByProjectId(projectId)).thenReturn(Optional.of(
                GitIntegration.builder()
                        .projectId(projectId)
                        .repositoryUrl("https://github.com/org/repo")
                        .webhookSecret(SECRET)
                        .build()));
        when(taskRepository.findByProjectId(projectId)).thenReturn(List.of(task));
        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));
        when(gitEventRepository.findByProjectIdAndTypeAndExternalId(any(), any(), any()))
                .thenReturn(Optional.empty());
        when(gitEventRepository.save(any(GitEvent.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    // ── firma ────────────────────────────────────────────────────────────────

    @Test
    void verifySignature_acceptsValidSignature() {
        byte[] payload = "{\"hello\":\"world\"}".getBytes(StandardCharsets.UTF_8);
        assertThat(GitWebhookService.verifySignature(SECRET, payload, sign(payload))).isTrue();
    }

    @Test
    void verifySignature_rejectsWrongSecretMissingHeaderAndBadPrefix() {
        byte[] payload = "{\"hello\":\"world\"}".getBytes(StandardCharsets.UTF_8);
        assertThat(GitWebhookService.verifySignature("other", payload, sign(payload))).isFalse();
        assertThat(GitWebhookService.verifySignature(SECRET, payload, null)).isFalse();
        assertThat(GitWebhookService.verifySignature(SECRET, payload, "sha1=abc")).isFalse();
    }

    @Test
    void handleGitHubWebhook_throwsWhenSignatureIsInvalid() {
        byte[] payload = "{}".getBytes(StandardCharsets.UTF_8);
        assertThatThrownBy(() -> service.handleGitHubWebhook(projectId, "push", "sha256=deadbeef", payload))
                .isInstanceOf(ForbiddenException.class)
                .hasMessage("INVALID_WEBHOOK_SIGNATURE");
    }

    @Test
    void handleGitHubWebhook_throwsWhenProjectHasNoIntegration() {
        UUID unknown = UUID.randomUUID();
        when(integrationRepository.findByProjectId(unknown)).thenReturn(Optional.empty());
        byte[] payload = "{}".getBytes(StandardCharsets.UTF_8);

        assertThatThrownBy(() -> service.handleGitHubWebhook(unknown, "push", sign(payload), payload))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("GIT_INTEGRATION_NOT_FOUND");
    }

    // ── parseo ───────────────────────────────────────────────────────────────

    @Test
    void handleGitHubWebhook_push_linksCommitByTaskRefInMessage() {
        String json = """
                {
                  "ref": "refs/heads/main",
                  "sender": { "login": "octocat" },
                  "commits": [
                    {
                      "id": "abc1234def5678",
                      "message": "TASK-%s fix login\\nmore detail",
                      "url": "https://github.com/org/repo/commit/abc1234def5678",
                      "author": { "username": "dev1" }
                    }
                  ]
                }
                """.formatted(GitWebhookService.shortId(task.getId()));

        int stored = deliver("push", json);

        assertThat(stored).isEqualTo(1);
        GitEvent saved = captureSaved();
        assertThat(saved.getType()).isEqualTo(GitEventType.COMMIT);
        assertThat(saved.getTaskId()).isEqualTo(task.getId());
        assertThat(saved.getExternalId()).isEqualTo("abc1234def5678");
        assertThat(saved.getTitle()).isEqualTo("TASK-%s fix login".formatted(GitWebhookService.shortId(task.getId())));
        assertThat(saved.getAuthor()).isEqualTo("dev1");
    }

    @Test
    void handleGitHubWebhook_push_ignoresCommitsWithoutTaskRef() {
        String json = """
                {
                  "ref": "refs/heads/main",
                  "commits": [
                    { "id": "abc1234", "message": "chore: bump deps", "url": "https://x/commit/abc1234" }
                  ]
                }
                """;

        assertThat(deliver("push", json)).isZero();
        verify(gitEventRepository, never()).save(any(GitEvent.class));
    }

    @Test
    void handleGitHubWebhook_push_linksCommitByBranchNameWhenMessageHasNoRef() {
        String json = """
                {
                  "ref": "refs/heads/feature/TASK-%s-login",
                  "sender": { "login": "octocat" },
                  "commits": [
                    { "id": "abc1234", "message": "wip", "url": "https://x/commit/abc1234" }
                  ]
                }
                """.formatted(GitWebhookService.shortId(task.getId()));

        assertThat(deliver("push", json)).isEqualTo(1);
        assertThat(captureSaved().getTaskId()).isEqualTo(task.getId());
    }

    @Test
    void handleGitHubWebhook_pullRequest_storesMergedStatus() {
        String json = """
                {
                  "pull_request": {
                    "number": 42,
                    "title": "TASK-%s implement login",
                    "html_url": "https://github.com/org/repo/pull/42",
                    "state": "closed",
                    "merged": true,
                    "head": { "ref": "feature/login" },
                    "user": { "login": "dev1" }
                  }
                }
                """.formatted(GitWebhookService.shortId(task.getId()));

        assertThat(deliver("pull_request", json)).isEqualTo(1);
        GitEvent saved = captureSaved();
        assertThat(saved.getType()).isEqualTo(GitEventType.PULL_REQUEST);
        assertThat(saved.getExternalId()).isEqualTo("42");
        assertThat(saved.getStatus()).isEqualTo("merged");
    }

    @Test
    void handleGitHubWebhook_pullRequest_updatesExistingInsteadOfDuplicating() {
        GitEvent existing = GitEvent.builder()
                .id(UUID.randomUUID())
                .projectId(projectId)
                .taskId(task.getId())
                .type(GitEventType.PULL_REQUEST)
                .externalId("42")
                .externalUrl("https://github.com/org/repo/pull/42")
                .title("TASK ref")
                .author("dev1")
                .status("open")
                .build();
        when(gitEventRepository.findByProjectIdAndTypeAndExternalId(projectId, GitEventType.PULL_REQUEST, "42"))
                .thenReturn(Optional.of(existing));

        String json = """
                {
                  "pull_request": {
                    "number": 42,
                    "title": "TASK-%s implement login",
                    "html_url": "https://github.com/org/repo/pull/42",
                    "state": "closed",
                    "merged": true,
                    "head": { "ref": "feature/login" },
                    "user": { "login": "dev1" }
                  }
                }
                """.formatted(GitWebhookService.shortId(task.getId()));

        // No es un evento nuevo: no se cuenta ni se notifica, pero el estado se actualiza
        assertThat(deliver("pull_request", json)).isZero();
        assertThat(existing.getStatus()).isEqualTo("merged");
        verify(gitEventRepository).save(existing);
    }

    @Test
    void handleGitHubWebhook_branchCreated_storesBranchEvent() {
        String json = """
                {
                  "ref_type": "branch",
                  "ref": "feature/TASK-%s-login",
                  "repository": { "html_url": "https://github.com/org/repo" },
                  "sender": { "login": "dev1" }
                }
                """.formatted(GitWebhookService.shortId(task.getId()));

        assertThat(deliver("create", json)).isEqualTo(1);
        GitEvent saved = captureSaved();
        assertThat(saved.getType()).isEqualTo(GitEventType.BRANCH);
        assertThat(saved.getExternalUrl())
                .isEqualTo("https://github.com/org/repo/tree/feature/TASK-%s-login"
                        .formatted(GitWebhookService.shortId(task.getId())));
    }

    @Test
    void handleGitHubWebhook_ignoresTagCreationAndUnknownEvents() {
        String tag = """
                { "ref_type": "tag", "ref": "TASK-%s", "repository": { "html_url": "https://x" } }
                """.formatted(GitWebhookService.shortId(task.getId()));

        assertThat(deliver("create", tag)).isZero();
        assertThat(deliver("issues", "{}")).isZero();
        assertThat(deliver(null, "{}")).isZero();
    }

    @Test
    void handleGitHubWebhook_returnsZeroOnMalformedPayload() {
        assertThat(deliver("push", "not json at all")).isZero();
    }

    @Test
    void handleGitHubWebhook_notifiesAssigneeOnNewEvent() {
        task.setAssigneeId(UUID.randomUUID());
        when(projectServiceClient.getMemberPermissions(projectId, task.getAssigneeId()))
                .thenReturn(TestDataFactory.memberPermissions());

        String json = """
                {
                  "ref": "refs/heads/main",
                  "commits": [
                    { "id": "abc1234", "message": "TASK-%s fix", "url": "https://x/commit/abc1234",
                      "author": { "username": "dev1" } }
                  ]
                }
                """.formatted(GitWebhookService.shortId(task.getId()));

        deliver("push", json);

        verify(userServiceClient).sendNotification(
                org.mockito.ArgumentMatchers.eq(task.getAssigneeId()),
                any(), any(), any(), any(), any());
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private int deliver(String eventName, String json) {
        byte[] payload = json.getBytes(StandardCharsets.UTF_8);
        return service.handleGitHubWebhook(projectId, eventName, sign(payload), payload);
    }

    private GitEvent captureSaved() {
        ArgumentCaptor<GitEvent> captor = ArgumentCaptor.forClass(GitEvent.class);
        verify(gitEventRepository).save(captor.capture());
        return captor.getValue();
    }

    private static String sign(byte[] payload) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return "sha256=" + HexFormat.of().formatHex(mac.doFinal(payload));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
