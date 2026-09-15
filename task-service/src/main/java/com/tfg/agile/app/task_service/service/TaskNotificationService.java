package com.tfg.agile.app.task_service.service;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;
import com.tfg.agile.app.task_service.client.ProjectMemberIdsDto;
import com.tfg.agile.app.task_service.client.ProjectServiceClient;
import com.tfg.agile.app.task_service.client.UserServiceClient;
import com.tfg.agile.app.task_service.entity.Epic;
import com.tfg.agile.app.task_service.entity.Sprint;
import com.tfg.agile.app.task_service.entity.Task;
import com.tfg.agile.app.task_service.entity.TaskComment;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class TaskNotificationService {

    public static final String TYPE_COMMENT_MENTION = "COMMENT_MENTION";
    public static final String TYPE_TASK_COMMENT = "TASK_COMMENT";
    public static final String TYPE_SPRINT_STARTED = "SPRINT_STARTED";
    public static final String TYPE_SPRINT_COMPLETED = "SPRINT_COMPLETED";
    public static final String TYPE_TASK_BLOCKED = "TASK_BLOCKED";
    public static final String TYPE_EPIC_OPENED = "EPIC_OPENED";
    public static final String TYPE_EPIC_COMPLETED = "EPIC_COMPLETED";

    private static final Logger log = LoggerFactory.getLogger(TaskNotificationService.class);
    private static final Pattern USER_MENTION_PATTERN = Pattern.compile("@\\{([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}):[^}]+}");

    private final ProjectServiceClient projectServiceClient;
    private final UserServiceClient userServiceClient;
    private final ObjectMapper objectMapper;

    public TaskNotificationService(ProjectServiceClient projectServiceClient,
                                   UserServiceClient userServiceClient,
                                   ObjectMapper objectMapper) {
        this.projectServiceClient = projectServiceClient;
        this.userServiceClient = userServiceClient;
        this.objectMapper = objectMapper;
    }

    public void notifyCommentCreated(Task task, TaskComment comment, UUID actorUserId) {
        try {
            ProjectMemberIdsDto members = projectServiceClient.getMemberIds(task.getProjectId());
            if (!hasMembers(members)) return;

            Set<UUID> projectMembers = new LinkedHashSet<>(members.memberUserIds());
            Set<UUID> mentionedUserIds = mentionedUserIds(comment.getContent(), projectMembers, actorUserId);
            String link = boardLink(members.workspaceId(), task.getProjectId());
            Map<String, Object> data = taskData(task);
            data.put("commentId", comment.getId().toString());

            for (UUID mentionedUserId : mentionedUserIds) {
                send(mentionedUserId,
                        "Te han mencionado en una tarea",
                        "Te han mencionado en la tarea «" + task.getTitle() + "».",
                        TYPE_COMMENT_MENTION,
                        link,
                        data,
                        actorUserId);
            }

            UUID assigneeId = task.getAssigneeId();
            if (assigneeId != null
                    && !assigneeId.equals(actorUserId)
                    && projectMembers.contains(assigneeId)
                    && !mentionedUserIds.contains(assigneeId)) {
                send(assigneeId,
                        "Nuevo comentario en tu tarea",
                        "Han comentado en la tarea «" + task.getTitle() + "».",
                        TYPE_TASK_COMMENT,
                        link,
                        data,
                        actorUserId);
            }
        } catch (Exception e) {
            log.warn("Failed to publish comment notifications for task {}: {}", task.getId(), e.getMessage());
        }
    }

    public void notifyTaskBlocked(Task blockingTask, Task blockedTask, UUID actorUserId) {
        try {
            UUID assigneeId = blockedTask.getAssigneeId();
            if (assigneeId == null || assigneeId.equals(actorUserId)) return;

            ProjectMemberIdsDto members = projectServiceClient.getMemberIds(blockedTask.getProjectId());
            if (!hasMembers(members) || !members.memberUserIds().contains(assigneeId)) return;

            Map<String, Object> data = taskData(blockedTask);
            data.put("blockedTaskId", blockedTask.getId().toString());
            data.put("blockedTaskTitle", blockedTask.getTitle());
            data.put("blockingTaskId", blockingTask.getId().toString());
            data.put("blockingTaskTitle", blockingTask.getTitle());

            send(assigneeId,
                    "Tarea bloqueada",
                    "La tarea «" + blockedTask.getTitle() + "» ha quedado bloqueada por «" + blockingTask.getTitle() + "».",
                    TYPE_TASK_BLOCKED,
                    boardLink(members.workspaceId(), blockedTask.getProjectId()),
                    data,
                    actorUserId);
        } catch (Exception e) {
            log.warn("Failed to publish blocked task notification for task {}: {}", blockedTask.getId(), e.getMessage());
        }
    }

    public void notifySprintStarted(Sprint sprint, UUID actorUserId) {
        notifyProjectMembers(sprint.getProjectId(), actorUserId,
                "Sprint iniciado",
                "El sprint «" + sprint.getName() + "» ha comenzado.",
                TYPE_SPRINT_STARTED,
                (workspaceId) -> boardLink(workspaceId, sprint.getProjectId()),
                sprintData(sprint));
    }

    public void notifySprintCompleted(Sprint sprint, UUID actorUserId) {
        notifyProjectMembers(sprint.getProjectId(), actorUserId,
                "Sprint completado",
                "El sprint «" + sprint.getName() + "» se ha completado.",
                TYPE_SPRINT_COMPLETED,
                (workspaceId) -> "/workspaces/" + workspaceId + "/projects/" + sprint.getProjectId() + "/sprints/" + sprint.getId() + "/report",
                sprintData(sprint));
    }

    public void notifyEpicOpened(Epic epic, UUID actorUserId) {
        notifyProjectMembers(epic.getProjectId(), actorUserId,
                "Epic abierto",
                "El epic «" + epic.getName() + "» está abierto.",
                TYPE_EPIC_OPENED,
                (workspaceId) -> "/workspaces/" + workspaceId + "/projects/" + epic.getProjectId() + "/epics",
                epicData(epic));
    }

    public void notifyEpicCompleted(Epic epic, UUID actorUserId) {
        notifyProjectMembers(epic.getProjectId(), actorUserId,
                "Epic completado",
                "El epic «" + epic.getName() + "» se ha completado.",
                TYPE_EPIC_COMPLETED,
                (workspaceId) -> "/workspaces/" + workspaceId + "/projects/" + epic.getProjectId() + "/epics",
                epicData(epic));
    }

    private void notifyProjectMembers(UUID projectId,
                                      UUID actorUserId,
                                      String title,
                                      String message,
                                      String type,
                                      LinkFactory linkFactory,
                                      Map<String, Object> data) {
        try {
            ProjectMemberIdsDto members = projectServiceClient.getMemberIds(projectId);
            if (!hasMembers(members)) return;
            String link = linkFactory.link(members.workspaceId());
            for (UUID memberUserId : members.memberUserIds()) {
                if (memberUserId == null || memberUserId.equals(actorUserId)) continue;
                send(memberUserId, title, message, type, link, data, actorUserId);
            }
        } catch (Exception e) {
            log.warn("Failed to publish project notification for project {} and type {}: {}", projectId, type, e.getMessage());
        }
    }

    private Set<UUID> mentionedUserIds(String content, Set<UUID> projectMembers, UUID actorUserId) {
        Set<UUID> result = new LinkedHashSet<>();
        if (content == null || content.isBlank()) return result;
        Matcher matcher = USER_MENTION_PATTERN.matcher(content);
        while (matcher.find()) {
            try {
                UUID userId = UUID.fromString(matcher.group(1));
                if (!userId.equals(actorUserId) && projectMembers.contains(userId)) {
                    result.add(userId);
                }
            } catch (IllegalArgumentException ignored) {
                // Regex already validates UUID shape; keep this guard for malformed legacy text.
            }
        }
        return result;
    }

    private void send(UUID userId,
                      String title,
                      String message,
                      String type,
                      String link,
                      Map<String, Object> data,
                      UUID actorUserId) throws JacksonException {
        userServiceClient.sendNotification(userId, title, message, type, link, objectMapper.writeValueAsString(data), actorUserId);
    }

    private boolean hasMembers(ProjectMemberIdsDto members) {
        return members != null && members.workspaceId() != null && members.memberUserIds() != null && !members.memberUserIds().isEmpty();
    }

    private String boardLink(UUID workspaceId, UUID projectId) {
        return "/workspaces/" + workspaceId + "/projects/" + projectId + "/board";
    }

    private Map<String, Object> taskData(Task task) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("projectId", task.getProjectId().toString());
        data.put("taskId", task.getId().toString());
        data.put("taskTitle", task.getTitle());
        return data;
    }

    private Map<String, Object> sprintData(Sprint sprint) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("projectId", sprint.getProjectId().toString());
        data.put("sprintId", sprint.getId().toString());
        data.put("sprintName", sprint.getName());
        return data;
    }

    private Map<String, Object> epicData(Epic epic) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("projectId", epic.getProjectId().toString());
        data.put("epicId", epic.getId().toString());
        data.put("epicName", epic.getName());
        return data;
    }

    @FunctionalInterface
    private interface LinkFactory {
        String link(UUID workspaceId);
    }
}
