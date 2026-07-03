package com.tfg.agile.app.task_service.service;

import com.tfg.agile.app.task_service.client.ProjectServiceClient;
import com.tfg.agile.app.task_service.dto.CreateTaskRequestDto;
import com.tfg.agile.app.task_service.dto.MoveTaskRequestDto;
import com.tfg.agile.app.task_service.dto.UpdateTaskRequestDto;
import com.tfg.agile.app.task_service.entity.Task;
import com.tfg.agile.app.task_service.entity.TaskPriority;
import com.tfg.agile.app.task_service.entity.TaskStatus;
import com.tfg.agile.app.task_service.exception.ForbiddenException;
import com.tfg.agile.app.task_service.exception.ResourceNotFoundException;
import com.tfg.agile.app.task_service.repository.TaskRepository;
import com.tfg.agile.app.task_service.support.TestDataFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

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
class TaskServiceTest {

    @Mock
    private TaskRepository taskRepository;
    @Mock
    private ProjectServiceClient projectServiceClient;

    private TaskService service;

    @BeforeEach
    void setUp() {
        service = new TaskService(taskRepository, projectServiceClient);
    }

    @Test
    void findMyTasks_returnsAssignedTasks() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Task task = TestDataFactory.task(projectId, UUID.randomUUID());
        task.setAssigneeId(callerId);

        when(taskRepository.findByAssigneeId(callerId)).thenReturn(List.of(task));

        var response = service.findMyTasks(callerId);

        assertThat(response).hasSize(1);
        assertThat(response.get(0).id()).isEqualTo(task.getId());
    }

    @Test
    void findByProject_requiresMembership() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Task task = TestDataFactory.task(projectId, UUID.randomUUID());

        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.memberPermissions());
        when(taskRepository.findByProjectIdOrderByStatusAscPositionAsc(projectId)).thenReturn(List.of(task));

        var response = service.findByProject(projectId, callerId);

        assertThat(response).hasSize(1);
        verify(projectServiceClient).getMemberPermissions(projectId, callerId);
    }

    @Test
    void findById_throwsWhenTaskDoesNotExist() {
        UUID taskId = UUID.randomUUID();

        when(taskRepository.findById(taskId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.findById(taskId, UUID.randomUUID()))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("TASK_NOT_FOUND");
    }

    @Test
    void findById_returnsTaskWhenCallerIsMember() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Task task = TestDataFactory.task(projectId, UUID.randomUUID());

        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.memberPermissions());

        var response = service.findById(task.getId(), callerId);

        assertThat(response.id()).isEqualTo(task.getId());
        assertThat(response.projectId()).isEqualTo(projectId);
    }

    @Test
    void create_throwsForDeveloper() {
        UUID projectId = UUID.randomUUID();
        UUID callerId = UUID.randomUUID();

        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.memberPermissions());

        assertThatThrownBy(() -> service.create(projectId,
                new CreateTaskRequestDto("Task", "Desc", null, null, null),
                callerId))
                .isInstanceOf(ForbiddenException.class)
                .hasMessage("ONLY_PO_OR_ADMIN_CAN_CREATE_TASKS");
    }

    @Test
    void create_throwsForScrumMaster() {
        UUID projectId = UUID.randomUUID();
        UUID callerId = UUID.randomUUID();

        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.scrumMasterPermissions());

        assertThatThrownBy(() -> service.create(projectId,
                new CreateTaskRequestDto("Task", "Desc", null, null, null),
                callerId))
                .isInstanceOf(ForbiddenException.class)
                .hasMessage("ONLY_PO_OR_ADMIN_CAN_CREATE_TASKS");
    }

    @Test
    void create_setsDefaultsAndPersistsTask() {
        UUID projectId = UUID.randomUUID();
        UUID callerId = UUID.randomUUID();

        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.productOwnerPermissions());
        when(taskRepository.findByProjectIdAndStatusOrderByPositionAsc(projectId, TaskStatus.TODO)).thenReturn(List.of(new Task(), new Task()));
        when(taskRepository.save(any(Task.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = service.create(projectId,
                new CreateTaskRequestDto("Task", "Desc", null, null, null),
                callerId);

        assertThat(response.priority()).isEqualTo(TaskPriority.MEDIUM);
        assertThat(response.position()).isEqualTo(2);
        assertThat(response.reporterId()).isEqualTo(callerId);
    }

    @Test
    void update_throwsForDeveloperOnBacklogTask() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Task task = TestDataFactory.task(projectId, UUID.randomUUID()); // sprintId == null → backlog

        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.memberPermissions());

        assertThatThrownBy(() -> service.update(task.getId(),
                new UpdateTaskRequestDto("Updated", "Desc", "HIGH", null, null),
                callerId))
                .isInstanceOf(ForbiddenException.class)
                .hasMessage("ONLY_PO_OR_ADMIN_CAN_EDIT_BACKLOG_TASKS");
    }

    @Test
    void update_throwsForScrumMasterOnBacklogTask() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Task task = TestDataFactory.task(projectId, UUID.randomUUID());

        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.scrumMasterPermissions());

        assertThatThrownBy(() -> service.update(task.getId(),
                new UpdateTaskRequestDto("Updated", "Desc", "HIGH", null, null),
                callerId))
                .isInstanceOf(ForbiddenException.class)
                .hasMessage("ONLY_PO_OR_ADMIN_CAN_EDIT_BACKLOG_TASKS");
    }

    @Test
    void update_allowsProductOwnerToEditBacklogTask() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Task task = TestDataFactory.task(projectId, UUID.randomUUID());

        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.productOwnerPermissions());
        when(taskRepository.save(task)).thenReturn(task);

        var response = service.update(task.getId(),
                new UpdateTaskRequestDto("Updated by PO", "Desc", "CRITICAL", null, null),
                callerId);

        assertThat(response.title()).isEqualTo("Updated by PO");
        assertThat(response.priority()).isEqualTo(TaskPriority.CRITICAL);
    }

    @Test
    void update_allowsDeveloperToEditSprintTask() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Task task = TestDataFactory.task(projectId, UUID.randomUUID());
        task.setSprintId(UUID.randomUUID()); // task is in a sprint

        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.memberPermissions());
        when(taskRepository.save(task)).thenReturn(task);

        var response = service.update(task.getId(),
                new UpdateTaskRequestDto("Updated by Developer", "Desc", "HIGH", null, null),
                callerId);

        assertThat(response.title()).isEqualTo("Updated by Developer");
    }

    @Test
    void update_throwsForProductOwnerOnSprintTask() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Task task = TestDataFactory.task(projectId, UUID.randomUUID());
        task.setSprintId(UUID.randomUUID()); // task is in a sprint

        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.productOwnerPermissions());

        assertThatThrownBy(() -> service.update(task.getId(),
                new UpdateTaskRequestDto("Updated", "Desc", "HIGH", null, null),
                callerId))
                .isInstanceOf(ForbiddenException.class)
                .hasMessage("ONLY_DEVELOPERS_CAN_EDIT_SPRINT_TASKS");
    }

    @Test
    void update_throwsForScrumMasterOnSprintTask() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Task task = TestDataFactory.task(projectId, UUID.randomUUID());
        task.setSprintId(UUID.randomUUID());

        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.scrumMasterPermissions());

        assertThatThrownBy(() -> service.update(task.getId(),
                new UpdateTaskRequestDto("Updated", "Desc", "HIGH", null, null),
                callerId))
                .isInstanceOf(ForbiddenException.class)
                .hasMessage("ONLY_DEVELOPERS_CAN_EDIT_SPRINT_TASKS");
    }

    @Test
    void move_throwsForProductOwner() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Task task = TestDataFactory.task(projectId, UUID.randomUUID());

        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.productOwnerPermissions());

        assertThatThrownBy(() -> service.move(task.getId(), new MoveTaskRequestDto("done", 1), callerId))
                .isInstanceOf(ForbiddenException.class)
                .hasMessage("ONLY_DEVELOPERS_CAN_MOVE_TASKS");
    }

    @Test
    void move_throwsForScrumMaster() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Task task = TestDataFactory.task(projectId, UUID.randomUUID());

        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.scrumMasterPermissions());

        assertThatThrownBy(() -> service.move(task.getId(), new MoveTaskRequestDto("done", 1), callerId))
                .isInstanceOf(ForbiddenException.class)
                .hasMessage("ONLY_DEVELOPERS_CAN_MOVE_TASKS");
    }

    @Test
    void move_updatesTaskStatusAndPosition() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Task task = TestDataFactory.task(projectId, UUID.randomUUID());

        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.memberPermissions());
        when(taskRepository.save(task)).thenReturn(task);

        var response = service.move(task.getId(), new MoveTaskRequestDto("in_review", 4), callerId);

        assertThat(response.status()).isEqualTo(TaskStatus.IN_REVIEW);
        assertThat(response.position()).isEqualTo(4);
    }

    @Test
    void delete_throwsForDeveloperOnBacklogTask() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Task task = TestDataFactory.task(projectId, UUID.randomUUID()); // sprintId == null → backlog

        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.memberPermissions());

        assertThatThrownBy(() -> service.delete(task.getId(), callerId))
                .isInstanceOf(ForbiddenException.class)
                .hasMessage("ONLY_PO_OR_ADMIN_CAN_DELETE_BACKLOG_TASKS");
        verify(taskRepository, never()).delete(any(Task.class));
    }

    @Test
    void delete_throwsForScrumMasterOnBacklogTask() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Task task = TestDataFactory.task(projectId, UUID.randomUUID());

        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.scrumMasterPermissions());

        assertThatThrownBy(() -> service.delete(task.getId(), callerId))
                .isInstanceOf(ForbiddenException.class)
                .hasMessage("ONLY_PO_OR_ADMIN_CAN_DELETE_BACKLOG_TASKS");
        verify(taskRepository, never()).delete(any(Task.class));
    }

    @Test
    void delete_removesBacklogTaskForProductOwner() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Task task = TestDataFactory.task(projectId, UUID.randomUUID());

        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.productOwnerPermissions());

        service.delete(task.getId(), callerId);

        verify(taskRepository).delete(task);
    }

    @Test
    void delete_removesBacklogTaskForAdmin() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Task task = TestDataFactory.task(projectId, UUID.randomUUID());

        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.adminPermissions());

        service.delete(task.getId(), callerId);

        verify(taskRepository).delete(task);
    }

    @Test
    void delete_throwsForProductOwnerOnSprintTask() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Task task = TestDataFactory.task(projectId, UUID.randomUUID());
        task.setSprintId(UUID.randomUUID());

        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.productOwnerPermissions());

        assertThatThrownBy(() -> service.delete(task.getId(), callerId))
                .isInstanceOf(ForbiddenException.class)
                .hasMessage("ONLY_DEVELOPERS_CAN_DELETE_SPRINT_TASKS");
        verify(taskRepository, never()).delete(any(Task.class));
    }

    @Test
    void delete_removesSprintTaskForDeveloper() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Task task = TestDataFactory.task(projectId, UUID.randomUUID());
        task.setSprintId(UUID.randomUUID());

        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.memberPermissions());

        service.delete(task.getId(), callerId);

        verify(taskRepository).delete(task);
    }
}

