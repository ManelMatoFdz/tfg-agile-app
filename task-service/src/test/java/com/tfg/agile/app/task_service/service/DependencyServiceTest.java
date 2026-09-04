package com.tfg.agile.app.task_service.service;

import com.tfg.agile.app.task_service.client.ProjectServiceClient;
import com.tfg.agile.app.task_service.dto.CreateDependencyRequestDto;
import com.tfg.agile.app.task_service.entity.Task;
import com.tfg.agile.app.task_service.entity.TaskActivityType;
import com.tfg.agile.app.task_service.entity.TaskDependency;
import com.tfg.agile.app.task_service.exception.ConflictException;
import com.tfg.agile.app.task_service.exception.ForbiddenException;
import com.tfg.agile.app.task_service.exception.ResourceNotFoundException;
import com.tfg.agile.app.task_service.repository.TaskDependencyRepository;
import com.tfg.agile.app.task_service.repository.TaskRepository;
import com.tfg.agile.app.task_service.support.TestDataFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DependencyServiceTest {

    @Mock
    private TaskDependencyRepository dependencyRepository;
    @Mock
    private TaskRepository taskRepository;
    @Mock
    private ProjectServiceClient projectServiceClient;
    @Mock
    private ActivityService activityService;

    private DependencyService service;

    @BeforeEach
    void setUp() {
        service = new DependencyService(dependencyRepository, taskRepository, projectServiceClient, activityService);
    }

    @Test
    void findByTask_returnsEnrichedDependencies() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Task blockingTask = taskWithTitle(projectId, "Backend API", null);
        Task blockedTask = taskWithTitle(projectId, "Frontend board", null);
        TaskDependency dependency = dependency(blockingTask.getId(), blockedTask.getId(), callerId);

        when(taskRepository.findById(blockingTask.getId())).thenReturn(Optional.of(blockingTask));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.memberPermissions());
        when(dependencyRepository.findByBlockingTaskIdOrBlockedTaskId(blockingTask.getId(), blockingTask.getId()))
                .thenReturn(List.of(dependency));
        when(taskRepository.findAllById(any())).thenReturn(List.of(blockingTask, blockedTask));

        var result = service.findByTask(blockingTask.getId(), callerId);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).blockingTaskTitle()).isEqualTo("Backend API");
        assertThat(result.get(0).blockedTaskTitle()).isEqualTo("Frontend board");
        assertThat(result.get(0).blockingTaskStatus()).isEqualTo("TODO");
    }

    @Test
    void findByProject_returnsEmptyWhenProjectHasNoTasks() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();

        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.memberPermissions());
        when(taskRepository.findByProjectIdOrderByStatusAscPositionAsc(projectId)).thenReturn(List.of());

        var result = service.findByProject(projectId, callerId);

        assertThat(result).isEmpty();
        verify(dependencyRepository, never()).findByBlockingTaskIdInOrBlockedTaskIdIn(anyList(), anyList());
    }

    @Test
    void create_savesDependencyAndRecordsActivities() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        UUID dependencyId = UUID.randomUUID();
        Task blockingTask = taskWithTitle(projectId, "API contract", null);
        Task blockedTask = taskWithTitle(projectId, "Mobile integration", null);

        when(taskRepository.findById(blockingTask.getId())).thenReturn(Optional.of(blockingTask));
        when(taskRepository.findById(blockedTask.getId())).thenReturn(Optional.of(blockedTask));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.teamAdminPermissions());
        when(dependencyRepository.findByBlockingTaskIdOrBlockedTaskId(blockingTask.getId(), blockingTask.getId()))
                .thenReturn(List.of());
        when(dependencyRepository.findByBlockingTaskId(blockedTask.getId())).thenReturn(List.of());
        when(dependencyRepository.save(any(TaskDependency.class))).thenAnswer(invocation -> {
            TaskDependency saved = invocation.getArgument(0);
            saved.setId(dependencyId);
            saved.setCreatedAt(Instant.parse("2026-09-04T10:15:30Z"));
            return saved;
        });

        var result = service.create(blockingTask.getId(), new CreateDependencyRequestDto(blockedTask.getId()), callerId);

        assertThat(result.id()).isEqualTo(dependencyId);
        assertThat(result.blockingTaskTitle()).isEqualTo("API contract");
        assertThat(result.blockedTaskTitle()).isEqualTo("Mobile integration");
        verify(activityService).record(blockingTask.getId(), callerId, TaskActivityType.DEPENDENCY_ADDED, null, "Mobile integration");
        verify(activityService).record(blockedTask.getId(), callerId, TaskActivityType.DEPENDENCY_ADDED, "API contract", null);
        verify(projectServiceClient).touchProject(projectId);
    }

    @Test
    void create_throwsWhenTasksBelongToDifferentProjects() {
        UUID callerId = UUID.randomUUID();
        Task blockingTask = taskWithTitle(UUID.randomUUID(), "Task A", null);
        Task blockedTask = taskWithTitle(UUID.randomUUID(), "Task B", null);

        when(taskRepository.findById(blockingTask.getId())).thenReturn(Optional.of(blockingTask));
        when(taskRepository.findById(blockedTask.getId())).thenReturn(Optional.of(blockedTask));

        assertThatThrownBy(() -> service.create(blockingTask.getId(), new CreateDependencyRequestDto(blockedTask.getId()), callerId))
                .isInstanceOf(ConflictException.class)
                .hasMessage("DEPENDENCY_DIFFERENT_PROJECTS");
    }

    @Test
    void create_throwsWhenTaskDependsOnItself() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Task task = taskWithTitle(projectId, "Same task", null);

        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.adminPermissions());

        assertThatThrownBy(() -> service.create(task.getId(), new CreateDependencyRequestDto(task.getId()), callerId))
                .isInstanceOf(ConflictException.class)
                .hasMessage("DEPENDENCY_SELF_REFERENCE");

        verify(dependencyRepository, never()).save(any(TaskDependency.class));
    }

    @Test
    void create_throwsWhenDependencyAlreadyExists() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Task blockingTask = taskWithTitle(projectId, "Task A", null);
        Task blockedTask = taskWithTitle(projectId, "Task B", null);
        TaskDependency existingDependency = dependency(blockingTask.getId(), blockedTask.getId(), callerId);

        when(taskRepository.findById(blockingTask.getId())).thenReturn(Optional.of(blockingTask));
        when(taskRepository.findById(blockedTask.getId())).thenReturn(Optional.of(blockedTask));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.adminPermissions());
        when(dependencyRepository.findByBlockingTaskIdOrBlockedTaskId(blockingTask.getId(), blockingTask.getId()))
                .thenReturn(List.of(existingDependency));

        assertThatThrownBy(() -> service.create(blockingTask.getId(), new CreateDependencyRequestDto(blockedTask.getId()), callerId))
                .isInstanceOf(ConflictException.class)
                .hasMessage("DEPENDENCY_ALREADY_EXISTS");
    }

    @Test
    void create_throwsWhenCycleWouldBeCreated() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Task blockingTask = taskWithTitle(projectId, "Task A", null);
        Task blockedTask = taskWithTitle(projectId, "Task B", null);
        TaskDependency reverseDependency = dependency(blockedTask.getId(), blockingTask.getId(), callerId);

        when(taskRepository.findById(blockingTask.getId())).thenReturn(Optional.of(blockingTask));
        when(taskRepository.findById(blockedTask.getId())).thenReturn(Optional.of(blockedTask));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.teamAdminPermissions());
        when(dependencyRepository.findByBlockingTaskIdOrBlockedTaskId(blockingTask.getId(), blockingTask.getId()))
                .thenReturn(List.of());
        when(dependencyRepository.findByBlockingTaskId(blockedTask.getId())).thenReturn(List.of(reverseDependency));

        assertThatThrownBy(() -> service.create(blockingTask.getId(), new CreateDependencyRequestDto(blockedTask.getId()), callerId))
                .isInstanceOf(ConflictException.class)
                .hasMessage("DEPENDENCY_CYCLE_DETECTED");
    }

    @Test
    void create_throwsWhenRegularMemberEditsBacklogTask() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Task backlogTask = taskWithTitle(projectId, "Backlog task", null);
        Task blockedTask = taskWithTitle(projectId, "Blocked task", null);

        when(taskRepository.findById(backlogTask.getId())).thenReturn(Optional.of(backlogTask));
        when(taskRepository.findById(blockedTask.getId())).thenReturn(Optional.of(blockedTask));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.memberPermissions());

        assertThatThrownBy(() -> service.create(backlogTask.getId(), new CreateDependencyRequestDto(blockedTask.getId()), callerId))
                .isInstanceOf(ForbiddenException.class)
                .hasMessage("ONLY_PO_OR_ADMIN_CAN_EDIT_BACKLOG_TASKS");
    }

    @Test
    void create_throwsWhenProductOwnerEditsSprintTask() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Task sprintTask = taskWithTitle(projectId, "Sprint task", UUID.randomUUID());
        Task blockedTask = taskWithTitle(projectId, "Blocked task", null);

        when(taskRepository.findById(sprintTask.getId())).thenReturn(Optional.of(sprintTask));
        when(taskRepository.findById(blockedTask.getId())).thenReturn(Optional.of(blockedTask));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.productOwnerPermissions());

        assertThatThrownBy(() -> service.create(sprintTask.getId(), new CreateDependencyRequestDto(blockedTask.getId()), callerId))
                .isInstanceOf(ForbiddenException.class)
                .hasMessage("ONLY_DEVELOPERS_CAN_EDIT_SPRINT_TASKS");
    }

    @Test
    void delete_removesDependencyAndRecordsActivities() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Task blockingTask = taskWithTitle(projectId, "Blocking task", null);
        Task blockedTask = taskWithTitle(projectId, "Blocked task", null);
        TaskDependency dependency = dependency(blockingTask.getId(), blockedTask.getId(), callerId);

        when(taskRepository.findById(blockingTask.getId())).thenReturn(Optional.of(blockingTask));
        when(taskRepository.findById(blockedTask.getId())).thenReturn(Optional.of(blockedTask));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.adminPermissions());
        when(dependencyRepository.findById(dependency.getId())).thenReturn(Optional.of(dependency));

        service.delete(blockingTask.getId(), dependency.getId(), callerId);

        verify(dependencyRepository).delete(dependency);
        verify(activityService).record(blockingTask.getId(), callerId, TaskActivityType.DEPENDENCY_REMOVED, "Blocked task", null);
        verify(activityService).record(blockedTask.getId(), callerId, TaskActivityType.DEPENDENCY_REMOVED, null, "Blocking task");
        verify(projectServiceClient).touchProject(projectId);
    }

    @Test
    void delete_throwsWhenDependencyDoesNotBelongToTask() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Task task = taskWithTitle(projectId, "Current task", null);
        TaskDependency dependency = dependency(UUID.randomUUID(), UUID.randomUUID(), callerId);

        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.teamAdminPermissions());
        when(dependencyRepository.findById(dependency.getId())).thenReturn(Optional.of(dependency));

        assertThatThrownBy(() -> service.delete(task.getId(), dependency.getId(), callerId))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("DEPENDENCY_NOT_FOUND");
    }

    @Test
    void delete_recordsAvailableSideWhenOtherTaskIsMissing() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Task task = taskWithTitle(projectId, "Current task", null);
        TaskDependency dependency = dependency(task.getId(), UUID.randomUUID(), callerId);

        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.adminPermissions());
        when(dependencyRepository.findById(dependency.getId())).thenReturn(Optional.of(dependency));
        when(taskRepository.findById(dependency.getBlockedTaskId())).thenReturn(Optional.empty());

        service.delete(task.getId(), dependency.getId(), callerId);

        verify(activityService).record(task.getId(), callerId, TaskActivityType.DEPENDENCY_REMOVED, null, null);
        verify(activityService, never()).record(eq(dependency.getBlockedTaskId()), eq(callerId), eq(TaskActivityType.DEPENDENCY_REMOVED), isNull(), any());
    }

    private Task taskWithTitle(UUID projectId, String title, UUID sprintId) {
        Task task = TestDataFactory.task(projectId, UUID.randomUUID());
        task.setTitle(title);
        task.setSprintId(sprintId);
        return task;
    }

    private TaskDependency dependency(UUID blockingTaskId, UUID blockedTaskId, UUID createdBy) {
        return TaskDependency.builder()
                .id(UUID.randomUUID())
                .blockingTaskId(blockingTaskId)
                .blockedTaskId(blockedTaskId)
                .createdBy(createdBy)
                .createdAt(Instant.parse("2026-09-04T09:00:00Z"))
                .build();
    }
}
