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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Recibe webhooks de GitHub, verifica la firma HMAC SHA-256, extrae la referencia
 * {@code TASK-<shortId>} del mensaje/branch/titulo y crea los GitEvent vinculados.
 */
@Service
public class GitWebhookService {

    private static final Logger log = LoggerFactory.getLogger(GitWebhookService.class);

    /** El shortId es el prefijo hexadecimal del UUID de la tarea (6-8 caracteres). */
    static final Pattern TASK_REF = Pattern.compile("TASK-([0-9a-fA-F]{6,8})");

    private final GitIntegrationRepository integrationRepository;
    private final GitEventRepository gitEventRepository;
    private final TaskRepository taskRepository;
    private final ProjectServiceClient projectServiceClient;
    private final UserServiceClient userServiceClient;
    private final ObjectMapper objectMapper;

    public GitWebhookService(GitIntegrationRepository integrationRepository,
                             GitEventRepository gitEventRepository,
                             TaskRepository taskRepository,
                             ProjectServiceClient projectServiceClient,
                             UserServiceClient userServiceClient,
                             ObjectMapper objectMapper) {
        this.integrationRepository = integrationRepository;
        this.gitEventRepository = gitEventRepository;
        this.taskRepository = taskRepository;
        this.projectServiceClient = projectServiceClient;
        this.userServiceClient = userServiceClient;
        this.objectMapper = objectMapper;
    }

    // ── firma ────────────────────────────────────────────────────────────────

    /**
     * Comprueba la cabecera {@code X-Hub-Signature-256} de GitHub, con formato
     * {@code sha256=<hex>}, usando comparacion en tiempo constante.
     */
    public static boolean verifySignature(String secret, byte[] payload, String signatureHeader) {
        if (signatureHeader == null || !signatureHeader.startsWith("sha256=")) {
            return false;
        }
        String expected = "sha256=" + hmacSha256Hex(secret, payload);
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                signatureHeader.getBytes(StandardCharsets.UTF_8));
    }

    private static String hmacSha256Hex(String secret, byte[] payload) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] digest = mac.doFinal(payload);
            StringBuilder sb = new StringBuilder(digest.length * 2);
            for (byte b : digest) {
                sb.append(Character.forDigit((b >> 4) & 0xF, 16));
                sb.append(Character.forDigit(b & 0xF, 16));
            }
            return sb.toString();
        } catch (Exception e) {
            throw new IllegalStateException("Cannot compute HMAC SHA-256", e);
        }
    }

    // ── recepcion ────────────────────────────────────────────────────────────

    @Transactional
    public int handleGitHubWebhook(UUID projectId, String eventName, String signature, byte[] payload) {
        GitIntegration integration = integrationRepository.findByProjectId(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("GIT_INTEGRATION_NOT_FOUND"));

        if (!verifySignature(integration.getWebhookSecret(), payload, signature)) {
            throw new ForbiddenException("INVALID_WEBHOOK_SIGNATURE");
        }

        JsonNode root;
        try {
            root = objectMapper.readTree(new String(payload, StandardCharsets.UTF_8));
        } catch (Exception e) {
            log.warn("Malformed GitHub webhook payload for project {}: {}", projectId, e.getMessage());
            return 0;
        }

        List<GitEvent> parsed = switch (eventName == null ? "" : eventName) {
            case "push" -> parsePush(projectId, root);
            case "pull_request" -> parsePullRequest(projectId, root);
            case "create" -> parseBranchCreated(projectId, root);
            default -> List.of();
        };

        int stored = 0;
        for (GitEvent event : parsed) {
            if (upsert(event)) {
                stored++;
            }
        }
        return stored;
    }

    private List<GitEvent> parsePush(UUID projectId, JsonNode root) {
        Map<String, UUID> index = shortIdIndex(projectId);
        List<GitEvent> events = new ArrayList<>();
        String branch = text(root, "ref").replaceFirst("^refs/heads/", "");

        for (JsonNode commit : root.path("commits")) {
            String message = text(commit, "message");
            String sha = text(commit, "id");
            if (sha.isEmpty()) continue;

            UUID taskId = resolveTask(index, message, branch);
            if (taskId == null) continue;

            events.add(GitEvent.builder()
                    .projectId(projectId)
                    .taskId(taskId)
                    .type(GitEventType.COMMIT)
                    .externalId(sha)
                    .externalUrl(text(commit, "url"))
                    .title(firstLine(message))
                    .author(commitAuthor(commit, root))
                    .build());
        }
        return events;
    }

    private List<GitEvent> parsePullRequest(UUID projectId, JsonNode root) {
        JsonNode pr = root.path("pull_request");
        if (pr.isMissingNode()) return List.of();

        String title = text(pr, "title");
        String headRef = text(pr.path("head"), "ref");
        UUID taskId = resolveTask(shortIdIndex(projectId), title, headRef);
        if (taskId == null) return List.of();

        String status;
        if (pr.path("merged").asBoolean(false)) {
            status = "merged";
        } else if ("closed".equals(text(pr, "state"))) {
            status = "closed";
        } else {
            status = "open";
        }

        return List.of(GitEvent.builder()
                .projectId(projectId)
                .taskId(taskId)
                .type(GitEventType.PULL_REQUEST)
                .externalId(String.valueOf(pr.path("number").asInt()))
                .externalUrl(text(pr, "html_url"))
                .title(title)
                .author(text(pr.path("user"), "login"))
                .status(status)
                .build());
    }

    private List<GitEvent> parseBranchCreated(UUID projectId, JsonNode root) {
        if (!"branch".equals(text(root, "ref_type"))) return List.of();

        String branch = text(root, "ref");
        UUID taskId = resolveTask(shortIdIndex(projectId), branch, null);
        if (taskId == null) return List.of();

        String repoUrl = text(root.path("repository"), "html_url");
        return List.of(GitEvent.builder()
                .projectId(projectId)
                .taskId(taskId)
                .type(GitEventType.BRANCH)
                .externalId(branch)
                .externalUrl(repoUrl.isEmpty() ? "" : repoUrl + "/tree/" + branch)
                .title(branch)
                .author(text(root.path("sender"), "login"))
                .build());
    }

    /**
     * Inserta el evento, o actualiza el existente si ya se habia recibido
     * (caso tipico: un PR que cambia de open a merged).
     *
     * @return true si el evento es nuevo
     */
    private boolean upsert(GitEvent event) {
        Optional<GitEvent> existing = gitEventRepository
                .findByProjectIdAndTypeAndExternalId(event.getProjectId(), event.getType(), event.getExternalId());

        if (existing.isPresent()) {
            GitEvent current = existing.get();
            current.setTitle(event.getTitle());
            current.setStatus(event.getStatus());
            current.setTaskId(event.getTaskId());
            gitEventRepository.save(current);
            return false;
        }

        GitEvent saved = gitEventRepository.save(event);
        notifyAssignee(saved);
        return true;
    }

    private void notifyAssignee(GitEvent event) {
        if (event.getTaskId() == null) return;
        Task task = taskRepository.findById(event.getTaskId()).orElse(null);
        if (task == null || task.getAssigneeId() == null) return;

        try {
            UUID workspaceId = projectServiceClient
                    .getMemberPermissions(task.getProjectId(), task.getAssigneeId())
                    .workspaceId();
            String link = "/workspaces/" + workspaceId + "/projects/" + task.getProjectId() + "/repository";
            userServiceClient.sendNotification(
                    task.getAssigneeId(),
                    "Actividad en el repositorio",
                    describe(event) + " en la tarea «" + task.getTitle() + "»",
                    "TASK_REMINDER",
                    link,
                    null
            );
        } catch (Exception e) {
            log.warn("Could not notify assignee of task {}: {}", task.getId(), e.getMessage());
        }
    }

    private String describe(GitEvent event) {
        return switch (event.getType()) {
            case COMMIT -> "Nuevo commit de @" + event.getAuthor();
            case BRANCH -> "Nueva branch " + event.getExternalId();
            case PULL_REQUEST -> "Pull request #" + event.getExternalId() + " (" + event.getStatus() + ")";
        };
    }

    // ── resolucion de TASK-<shortId> ─────────────────────────────────────────

    /** Prefijo hexadecimal del UUID que identifica la tarea en commits y branches. */
    public static String shortId(UUID taskId) {
        return taskId.toString().substring(0, 8);
    }

    private Map<String, UUID> shortIdIndex(UUID projectId) {
        Map<String, UUID> index = new HashMap<>();
        for (Task task : taskRepository.findByProjectId(projectId)) {
            index.put(shortId(task.getId()), task.getId());
        }
        return index;
    }

    /** Busca la referencia en los textos dados, en orden, y devuelve la primera tarea que exista. */
    private UUID resolveTask(Map<String, UUID> index, String... texts) {
        for (String text : texts) {
            if (text == null) continue;
            Matcher matcher = TASK_REF.matcher(text);
            while (matcher.find()) {
                String prefix = matcher.group(1).toLowerCase();
                UUID exact = index.get(prefix);
                if (exact != null) return exact;
                // Prefijo mas corto que 8: valido solo si identifica una unica tarea
                List<UUID> matches = index.entrySet().stream()
                        .filter(e -> e.getKey().startsWith(prefix))
                        .map(Map.Entry::getValue)
                        .toList();
                if (matches.size() == 1) return matches.getFirst();
            }
        }
        return null;
    }

    // ── helpers json ─────────────────────────────────────────────────────────

    private static String text(JsonNode node, String field) {
        return node.path(field).asString("");
    }

    private static String firstLine(String message) {
        int nl = message.indexOf('\n');
        return nl >= 0 ? message.substring(0, nl) : message;
    }

    private static String commitAuthor(JsonNode commit, JsonNode root) {
        String username = text(commit.path("author"), "username");
        if (!username.isEmpty()) return username;
        String name = text(commit.path("author"), "name");
        if (!name.isEmpty()) return name;
        return text(root.path("sender"), "login");
    }
}
