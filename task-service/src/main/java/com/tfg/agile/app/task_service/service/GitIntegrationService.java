package com.tfg.agile.app.task_service.service;

import com.tfg.agile.app.task_service.client.MemberPermissionsDto;
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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class GitIntegrationService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private static final Pattern COMMIT_URL = Pattern.compile("/commit/([0-9a-fA-F]{7,40})");
    private static final Pattern PR_URL = Pattern.compile("/pull/(\\d+)");

    private final GitIntegrationRepository integrationRepository;
    private final GitEventRepository gitEventRepository;
    private final TaskRepository taskRepository;
    private final ProjectServiceClient projectServiceClient;
    private final String webhookBaseUrl;

    public GitIntegrationService(GitIntegrationRepository integrationRepository,
                                 GitEventRepository gitEventRepository,
                                 TaskRepository taskRepository,
                                 ProjectServiceClient projectServiceClient,
                                 @Value("${app.git.webhook-base-url}") String webhookBaseUrl) {
        this.integrationRepository = integrationRepository;
        this.gitEventRepository = gitEventRepository;
        this.taskRepository = taskRepository;
        this.projectServiceClient = projectServiceClient;
        this.webhookBaseUrl = webhookBaseUrl;
    }

    // ── configuracion ────────────────────────────────────────────────────────

    /**
     * Crea o regenera la integracion del proyecto. Devuelve el secreto en claro:
     * es la unica ocasion en que se expone, para poder pegarlo en GitHub.
     */
    @Transactional
    public GitIntegrationDto setup(UUID projectId, SetupGitIntegrationRequestDto dto, UUID callerId) {
        requireAdmin(projectId, callerId);

        String secret = generateSecret();
        GitIntegration integration = integrationRepository.findByProjectId(projectId)
                .orElseGet(() -> GitIntegration.builder()
                        .projectId(projectId)
                        .createdBy(callerId)
                        .build());
        integration.setRepositoryUrl(dto.repositoryUrl().trim());
        integration.setWebhookSecret(secret);

        GitIntegration saved = integrationRepository.save(integration);
        return GitIntegrationDto.from(saved, webhookUrl(projectId), secret);
    }

    @Transactional(readOnly = true)
    public GitIntegrationDto getConfig(UUID projectId, UUID callerId) {
        projectServiceClient.getMemberPermissions(projectId, callerId);
        return integrationRepository.findByProjectId(projectId)
                .map(i -> GitIntegrationDto.from(i, webhookUrl(projectId), null))
                .orElse(null);
    }

    @Transactional
    public void disconnect(UUID projectId, UUID callerId) {
        requireAdmin(projectId, callerId);
        GitIntegration integration = integrationRepository.findByProjectId(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("GIT_INTEGRATION_NOT_FOUND"));
        gitEventRepository.deleteByProjectId(projectId);
        integrationRepository.delete(integration);
    }

    // ── consulta de eventos ──────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<GitEventDto> findByProject(UUID projectId, UUID callerId) {
        projectServiceClient.getMemberPermissions(projectId, callerId);
        List<GitEvent> events = gitEventRepository.findByProjectIdOrderByReceivedAtDesc(projectId);
        Map<UUID, String> titles = taskTitles(projectId);
        return events.stream()
                .map(e -> GitEventDto.from(e, titles.get(e.getTaskId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<GitEventDto> findByTask(UUID taskId, UUID callerId) {
        Task task = getTaskOrThrow(taskId);
        projectServiceClient.getMemberPermissions(task.getProjectId(), callerId);
        return gitEventRepository.findByTaskIdOrderByReceivedAtDesc(taskId).stream()
                .map(e -> GitEventDto.from(e, task.getTitle()))
                .toList();
    }

    // ── vinculacion manual ───────────────────────────────────────────────────

    @Transactional
    public GitEventDto linkManually(UUID taskId, LinkGitEventRequestDto dto, UUID callerId) {
        Task task = getTaskOrThrow(taskId);
        projectServiceClient.getMemberPermissions(task.getProjectId(), callerId);

        String url = dto.url().trim();
        GitEventType type;
        String externalId;

        Matcher commit = COMMIT_URL.matcher(url);
        Matcher pr = PR_URL.matcher(url);
        if (commit.find()) {
            type = GitEventType.COMMIT;
            externalId = commit.group(1);
        } else if (pr.find()) {
            type = GitEventType.PULL_REQUEST;
            externalId = pr.group(1);
        } else {
            throw new IllegalArgumentException("UNRECOGNIZED_GIT_URL");
        }

        GitEvent event = gitEventRepository
                .findByProjectIdAndTypeAndExternalId(task.getProjectId(), type, externalId)
                .orElseGet(() -> GitEvent.builder()
                        .projectId(task.getProjectId())
                        .type(type)
                        .externalId(externalId)
                        .externalUrl(url)
                        .author("")
                        .build());

        event.setTaskId(taskId);
        if (dto.title() != null && !dto.title().isBlank()) {
            event.setTitle(dto.title().trim());
        } else if (event.getTitle() == null) {
            event.setTitle(type == GitEventType.COMMIT
                    ? externalId.substring(0, Math.min(7, externalId.length()))
                    : "#" + externalId);
        }

        return GitEventDto.from(gitEventRepository.save(event), task.getTitle());
    }

    @Transactional
    public void unlink(UUID taskId, UUID eventId, UUID callerId) {
        Task task = getTaskOrThrow(taskId);
        projectServiceClient.getMemberPermissions(task.getProjectId(), callerId);
        GitEvent event = gitEventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("GIT_EVENT_NOT_FOUND"));
        if (!taskId.equals(event.getTaskId())) {
            throw new ResourceNotFoundException("GIT_EVENT_NOT_FOUND");
        }
        gitEventRepository.delete(event);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private String webhookUrl(UUID projectId) {
        return webhookBaseUrl + "/webhooks/github/" + projectId;
    }

    private static String generateSecret() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }

    private Task getTaskOrThrow(UUID taskId) {
        return taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("TASK_NOT_FOUND"));
    }

    private Map<UUID, String> taskTitles(UUID projectId) {
        return taskRepository.findByProjectId(projectId).stream()
                .collect(Collectors.toMap(Task::getId, Task::getTitle, (a, b) -> a));
    }

    private void requireAdmin(UUID projectId, UUID callerId) {
        MemberPermissionsDto perms = projectServiceClient.getMemberPermissions(projectId, callerId);
        if (!perms.workspaceAdmin() && !perms.teamAdmin()) {
            throw new ForbiddenException("ONLY_ADMIN_CAN_MANAGE_GIT_INTEGRATION");
        }
    }
}
