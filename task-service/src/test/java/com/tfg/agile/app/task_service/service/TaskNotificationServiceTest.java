package com.tfg.agile.app.task_service.service;

import tools.jackson.databind.ObjectMapper;
import com.tfg.agile.app.task_service.client.ProjectMemberIdsDto;
import com.tfg.agile.app.task_service.client.ProjectServiceClient;
import com.tfg.agile.app.task_service.client.UserServiceClient;
import com.tfg.agile.app.task_service.entity.Epic;
import com.tfg.agile.app.task_service.entity.Sprint;
import com.tfg.agile.app.task_service.entity.SprintStatus;
import com.tfg.agile.app.task_service.entity.Task;
import com.tfg.agile.app.task_service.entity.TaskComment;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TaskNotificationServiceTest {

    @Mock
    private ProjectServiceClient projectServiceClient;
    @Mock
    private UserServiceClient userServiceClient;

    private TaskNotificationService service;

    @BeforeEach
    void setUp() {
        service = new TaskNotificationService(projectServiceClient, userServiceClient, new ObjectMapper());
    }

    @Test
    void notifyCommentCreated_notifiesMentionedUsersAndAssigneeWithoutDuplicates() {
        UUID workspaceId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        UUID actorId = UUID.randomUUID();
        UUID mentionedId = UUID.randomUUID();
        UUID assigneeId = UUID.randomUUID();
        Task task = task(projectId, assigneeId);
        TaskComment comment = comment(task.getId(), actorId, "Hola @{" + mentionedId + ":Ana} y @{" + assigneeId + ":Luis}");

        when(projectServiceClient.getMemberIds(projectId))
                .thenReturn(new ProjectMemberIdsDto(workspaceId, List.of(actorId, mentionedId, assigneeId)));

        service.notifyCommentCreated(task, comment, actorId);

        verify(userServiceClient).sendNotification(eq(mentionedId), any(), any(), eq(TaskNotificationService.TYPE_COMMENT_MENTION), any(), any(), eq(actorId));
        verify(userServiceClient).sendNotification(eq(assigneeId), any(), any(), eq(TaskNotificationService.TYPE_COMMENT_MENTION), any(), any(), eq(actorId));
        verify(userServiceClient, never()).sendNotification(eq(assigneeId), any(), any(), eq(TaskNotificationService.TYPE_TASK_COMMENT), any(), any(), eq(actorId));
    }

    @Test
    void notifyCommentCreated_notifiesAssigneeWhenNotMentioned() {
        UUID workspaceId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        UUID actorId = UUID.randomUUID();
        UUID assigneeId = UUID.randomUUID();
        Task task = task(projectId, assigneeId);
        TaskComment comment = comment(task.getId(), actorId, "Sin menciones");

        when(projectServiceClient.getMemberIds(projectId))
                .thenReturn(new ProjectMemberIdsDto(workspaceId, List.of(actorId, assigneeId)));

        service.notifyCommentCreated(task, comment, actorId);

        verify(userServiceClient).sendNotification(eq(assigneeId), any(), any(), eq(TaskNotificationService.TYPE_TASK_COMMENT), any(), any(), eq(actorId));
    }

    @Test
    void notifyTaskBlocked_notifiesAssigneeOnlyWhenActorIsDifferent() {
        UUID workspaceId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        UUID actorId = UUID.randomUUID();
        UUID assigneeId = UUID.randomUUID();
        Task blockingTask = task(projectId, actorId);
        blockingTask.setTitle("API");
        Task blockedTask = task(projectId, assigneeId);
        blockedTask.setTitle("Frontend");

        when(projectServiceClient.getMemberIds(projectId))
                .thenReturn(new ProjectMemberIdsDto(workspaceId, List.of(actorId, assigneeId)));

        service.notifyTaskBlocked(blockingTask, blockedTask, actorId);

        verify(userServiceClient).sendNotification(eq(assigneeId), any(), any(), eq(TaskNotificationService.TYPE_TASK_BLOCKED), any(), any(), eq(actorId));
    }

    @Test
    void notifyTaskBlocked_skipsWhenActorIsBlockedTaskAssignee() {
        UUID projectId = UUID.randomUUID();
        UUID actorId = UUID.randomUUID();
        Task blockingTask = task(projectId, UUID.randomUUID());
        Task blockedTask = task(projectId, actorId);

        service.notifyTaskBlocked(blockingTask, blockedTask, actorId);

        verify(projectServiceClient, never()).getMemberIds(any());
        verify(userServiceClient, never()).sendNotification(any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void notifySprintStarted_notifiesProjectMembersExceptActor() {
        UUID workspaceId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        UUID actorId = UUID.randomUUID();
        UUID memberId = UUID.randomUUID();
        Sprint sprint = Sprint.builder()
                .id(UUID.randomUUID())
                .projectId(projectId)
                .name("Sprint 1")
                .status(SprintStatus.ACTIVE)
                .build();

        when(projectServiceClient.getMemberIds(projectId))
                .thenReturn(new ProjectMemberIdsDto(workspaceId, List.of(actorId, memberId)));

        service.notifySprintStarted(sprint, actorId);

        verify(userServiceClient, never()).sendNotification(eq(actorId), any(), any(), any(), any(), any(), any());
        verify(userServiceClient).sendNotification(eq(memberId), any(), any(), eq(TaskNotificationService.TYPE_SPRINT_STARTED), any(), any(), eq(actorId));
    }

    @Test
    void notifyEpicCompleted_includesEpicData() {
        UUID workspaceId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        UUID actorId = UUID.randomUUID();
        UUID memberId = UUID.randomUUID();
        Epic epic = Epic.builder().id(UUID.randomUUID()).projectId(projectId).name("Release").createdBy(actorId).build();

        when(projectServiceClient.getMemberIds(projectId))
                .thenReturn(new ProjectMemberIdsDto(workspaceId, List.of(actorId, memberId)));

        service.notifyEpicCompleted(epic, actorId);

        ArgumentCaptor<String> dataCaptor = ArgumentCaptor.forClass(String.class);
        verify(userServiceClient).sendNotification(eq(memberId), any(), any(), eq(TaskNotificationService.TYPE_EPIC_COMPLETED), any(), dataCaptor.capture(), eq(actorId));
        assertThat(dataCaptor.getValue()).contains("\"epicId\":\"" + epic.getId() + "\"");
    }

    private Task task(UUID projectId, UUID assigneeId) {
        return Task.builder()
                .id(UUID.randomUUID())
                .projectId(projectId)
                .title("Task")
                .reporterId(UUID.randomUUID())
                .assigneeId(assigneeId)
                .build();
    }

    private TaskComment comment(UUID taskId, UUID authorId, String content) {
        return TaskComment.builder()
                .id(UUID.randomUUID())
                .taskId(taskId)
                .authorId(authorId)
                .content(content)
                .createdAt(Instant.now())
                .build();
    }
}
