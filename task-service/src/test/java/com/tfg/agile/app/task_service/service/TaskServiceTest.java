package com.tfg.agile.app.task_service.service;

import com.tfg.agile.app.task_service.client.ProjectServiceClient;
import com.tfg.agile.app.task_service.client.UserServiceClient;
import com.tfg.agile.app.task_service.dto.CreateTaskRequestDto;
import com.tfg.agile.app.task_service.dto.MoveTaskRequestDto;
import com.tfg.agile.app.task_service.dto.UpdateTaskRequestDto;
import com.tfg.agile.app.task_service.entity.Task;
import com.tfg.agile.app.task_service.entity.TaskPriority;
import com.tfg.agile.app.task_service.entity.TaskType;
import com.tfg.agile.app.task_service.exception.ConflictException;
import com.tfg.agile.app.task_service.exception.ForbiddenException;
import com.tfg.agile.app.task_service.exception.ResourceNotFoundException;
import com.tfg.agile.app.task_service.repository.EpicRepository;
import com.tfg.agile.app.task_service.repository.LabelRepository;
import com.tfg.agile.app.task_service.repository.TaskRepository;
import com.tfg.agile.app.task_service.support.TestDataFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.Set;
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
    private LabelRepository labelRepository;
    @Mock
    private EpicRepository epicRepository;
    @Mock
    private ProjectServiceClient projectServiceClient;
    @Mock
    private UserServiceClient userServiceClient;
    @Mock
    private BoardColumnService boardColumnService;
    @Mock
    private ActivityService activityService;

    private TaskService service;

    @BeforeEach
    void setUp() {
        service = new TaskService(taskRepository, labelRepository, epicRepository, projectServiceClient, userServiceClient, boardColumnService, activityService);
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
                new CreateTaskRequestDto("Task", "Desc", null, null, null, null, null, null),
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
                new CreateTaskRequestDto("Task", "Desc", null, null, null, null, null, null),
                callerId))
                .isInstanceOf(ForbiddenException.class)
                .hasMessage("ONLY_PO_OR_ADMIN_CAN_CREATE_TASKS");
    }

    @Test
    void create_setsDefaultsAndPersistsTask() {
        UUID projectId = UUID.randomUUID();
        UUID callerId = UUID.randomUUID();

        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.productOwnerPermissions());
        when(boardColumnService.getFirstColumnName(projectId)).thenReturn("TODO");
        when(taskRepository.findByProjectIdAndStatusOrderByPositionAsc(projectId, "TODO")).thenReturn(List.of(new Task(), new Task()));
        when(taskRepository.save(any(Task.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = service.create(projectId,
                new CreateTaskRequestDto("Task", "Desc", null, null, null, null, null, null),
                callerId);

        assertThat(response.priority()).isEqualTo(TaskPriority.MEDIUM);
        assertThat(response.type()).isEqualTo(TaskType.TASK);
        assertThat(response.position()).isEqualTo(2);
        assertThat(response.reporterId()).isEqualTo(callerId);
    }

    @Test
    void create_storyType() {
        UUID projectId = UUID.randomUUID();
        UUID callerId = UUID.randomUUID();

        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.productOwnerPermissions());
        when(boardColumnService.getFirstColumnName(projectId)).thenReturn("TODO");
        when(taskRepository.findByProjectIdAndStatusOrderByPositionAsc(projectId, "TODO")).thenReturn(List.of());
        when(taskRepository.save(any(Task.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = service.create(projectId,
                new CreateTaskRequestDto("Story", "Desc", null, "STORY", null, null, null, null),
                callerId);

        assertThat(response.type()).isEqualTo(TaskType.STORY);
    }

    @Test
    void create_subtaskUnderStory_succeeds() {
        UUID projectId = UUID.randomUUID();
        UUID callerId = UUID.randomUUID();
        Task parent = TestDataFactory.story(projectId, callerId);

        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.productOwnerPermissions());
        when(taskRepository.findById(parent.getId())).thenReturn(Optional.of(parent));
        when(boardColumnService.getFirstColumnName(projectId)).thenReturn("TODO");
        when(taskRepository.findByProjectIdAndStatusOrderByPositionAsc(projectId, "TODO")).thenReturn(List.of());
        when(taskRepository.save(any(Task.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = service.create(projectId,
                new CreateTaskRequestDto("Subtask", "Desc", null, null, parent.getId(), null, null, null),
                callerId);

        assertThat(response.type()).isEqualTo(TaskType.TASK);
        assertThat(response.parentId()).isEqualTo(parent.getId());
        assertThat(response.storyPoints()).isNull();
    }

    @Test
    void create_subtaskUnderBug_throws() {
        UUID projectId = UUID.randomUUID();
        UUID callerId = UUID.randomUUID();
        Task bug = TestDataFactory.bug(projectId, callerId);

        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.productOwnerPermissions());
        when(taskRepository.findById(bug.getId())).thenReturn(Optional.of(bug));

        assertThatThrownBy(() -> service.create(projectId,
                new CreateTaskRequestDto("Subtask", "Desc", null, null, bug.getId(), null, null, null),
                callerId))
                .isInstanceOf(ConflictException.class)
                .hasMessage("ONLY_STORY_CAN_HAVE_CHILDREN");
    }

    @Test
    void create_subtaskUnderTask_throws() {
        UUID projectId = UUID.randomUUID();
        UUID callerId = UUID.randomUUID();
        Task task = TestDataFactory.task(projectId, callerId);

        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.productOwnerPermissions());
        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));

        assertThatThrownBy(() -> service.create(projectId,
                new CreateTaskRequestDto("Subtask", "Desc", null, null, task.getId(), null, null, null),
                callerId))
                .isInstanceOf(ConflictException.class)
                .hasMessage("ONLY_STORY_CAN_HAVE_CHILDREN");
    }

    @Test
    void create_grandchild_throws() {
        UUID projectId = UUID.randomUUID();
        UUID callerId = UUID.randomUUID();
        Task subtask = TestDataFactory.subtask(projectId, callerId, UUID.randomUUID());
        subtask.setType(TaskType.STORY); // force type to STORY to bypass first check — but parentId is set

        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.productOwnerPermissions());
        when(taskRepository.findById(subtask.getId())).thenReturn(Optional.of(subtask));

        assertThatThrownBy(() -> service.create(projectId,
                new CreateTaskRequestDto("Grandchild", "Desc", null, null, subtask.getId(), null, null, null),
                callerId))
                .isInstanceOf(ConflictException.class)
                .hasMessage("MAX_ONE_LEVEL_DEPTH");
    }

    @Test
    void create_subtaskInheritsSprint() {
        UUID projectId = UUID.randomUUID();
        UUID callerId = UUID.randomUUID();
        UUID sprintId = UUID.randomUUID();
        Task parent = TestDataFactory.story(projectId, callerId);
        parent.setSprintId(sprintId);

        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.productOwnerPermissions());
        when(taskRepository.findById(parent.getId())).thenReturn(Optional.of(parent));
        when(boardColumnService.getFirstColumnName(projectId)).thenReturn("TODO");
        when(taskRepository.findByProjectIdAndStatusOrderByPositionAsc(projectId, "TODO")).thenReturn(List.of());
        when(taskRepository.save(any(Task.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = service.create(projectId,
                new CreateTaskRequestDto("Subtask", "Desc", null, null, parent.getId(), null, null, null),
                callerId);

        assertThat(response.sprintId()).isEqualTo(sprintId);
    }

    @Test
    void move_storyWithChildren_throws() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Task story = TestDataFactory.story(projectId, callerId);

        when(taskRepository.findById(story.getId())).thenReturn(Optional.of(story));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.memberPermissions());
        when(taskRepository.countByParentId(story.getId())).thenReturn(3);

        assertThatThrownBy(() -> service.move(story.getId(), new MoveTaskRequestDto("IN_PROGRESS", 0), callerId))
                .isInstanceOf(ForbiddenException.class)
                .hasMessage("STORY_STATUS_IS_DERIVED");
    }

    @Test
    void move_subtask_autoCompletesParent() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Task parent = TestDataFactory.story(projectId, callerId);
        Task child1 = TestDataFactory.subtask(projectId, callerId, parent.getId());
        child1.setStatus("DONE");
        Task child2 = TestDataFactory.subtask(projectId, callerId, parent.getId());
        child2.setStatus("DONE");

        when(taskRepository.findById(child2.getId())).thenReturn(Optional.of(child2));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.memberPermissions());
        when(boardColumnService.isDoneEquivalent(projectId, "DONE")).thenReturn(true);
        when(taskRepository.save(child2)).thenReturn(child2);

        // Auto-complete evaluation
        when(taskRepository.findById(parent.getId())).thenReturn(Optional.of(parent));
        when(taskRepository.findByParentId(parent.getId())).thenReturn(List.of(child1, child2));
        when(boardColumnService.getDoneEquivalentStatuses(projectId)).thenReturn(Set.of("DONE"));
        when(taskRepository.save(parent)).thenReturn(parent);

        service.move(child2.getId(), new MoveTaskRequestDto("DONE", 0), callerId);

        assertThat(parent.getStatus()).isEqualTo("DONE");
        assertThat(parent.getCompletedAt()).isNotNull();
    }

    @Test
    void delete_story_deletesChildren() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Task story = TestDataFactory.story(projectId, callerId);
        Task child1 = TestDataFactory.subtask(projectId, callerId, story.getId());
        Task child2 = TestDataFactory.subtask(projectId, callerId, story.getId());

        when(taskRepository.findById(story.getId())).thenReturn(Optional.of(story));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.productOwnerPermissions());
        when(taskRepository.findByParentId(story.getId())).thenReturn(List.of(child1, child2));

        service.delete(story.getId(), callerId);

        verify(taskRepository).deleteAll(List.of(child1, child2));
        verify(taskRepository).delete(story);
    }

    @Test
    void updateStoryPoints_subtask_throws() {
        UUID taskId = UUID.randomUUID();
        Task subtask = TestDataFactory.subtask(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID());
        subtask.setId(taskId);

        when(taskRepository.findById(taskId)).thenReturn(Optional.of(subtask));

        assertThatThrownBy(() -> service.updateStoryPoints(taskId, 5))
                .isInstanceOf(ConflictException.class)
                .hasMessage("SUBTASKS_CANNOT_HAVE_STORY_POINTS");
    }

    // ── Original tests (updated constructors) ────────────────────────────────

    @Test
    void update_throwsForDeveloperOnBacklogTask() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Task task = TestDataFactory.task(projectId, UUID.randomUUID());

        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.memberPermissions());

        assertThatThrownBy(() -> service.update(task.getId(),
                new UpdateTaskRequestDto("Updated", "Desc", "HIGH", null, null, null, null),
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
                new UpdateTaskRequestDto("Updated", "Desc", "HIGH", null, null, null, null),
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
                new UpdateTaskRequestDto("Updated by PO", "Desc", "CRITICAL", null, null, null, null),
                callerId);

        assertThat(response.title()).isEqualTo("Updated by PO");
        assertThat(response.priority()).isEqualTo(TaskPriority.CRITICAL);
    }

    @Test
    void update_allowsDeveloperToEditSprintTask() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Task task = TestDataFactory.task(projectId, UUID.randomUUID());
        task.setSprintId(UUID.randomUUID());

        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.memberPermissions());
        when(taskRepository.save(task)).thenReturn(task);

        var response = service.update(task.getId(),
                new UpdateTaskRequestDto("Updated by Developer", "Desc", "HIGH", null, null, null, null),
                callerId);

        assertThat(response.title()).isEqualTo("Updated by Developer");
    }

    @Test
    void update_throwsForProductOwnerOnSprintTask() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Task task = TestDataFactory.task(projectId, UUID.randomUUID());
        task.setSprintId(UUID.randomUUID());

        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.productOwnerPermissions());

        assertThatThrownBy(() -> service.update(task.getId(),
                new UpdateTaskRequestDto("Updated", "Desc", "HIGH", null, null, null, null),
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
                new UpdateTaskRequestDto("Updated", "Desc", "HIGH", null, null, null, null),
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

        assertThat(response.status()).isEqualTo("in_review");
        assertThat(response.position()).isEqualTo(4);
    }

    @Test
    void delete_throwsForDeveloperOnBacklogTask() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Task task = TestDataFactory.task(projectId, UUID.randomUUID());

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

    // ── Subtask tests ─────────────────────────────────────────────────────────

    @Test
    void getSubtasks_returnsChildTasks() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Task parent = TestDataFactory.story(projectId, callerId);
        Task child = TestDataFactory.subtask(projectId, callerId, parent.getId());

        when(taskRepository.findById(parent.getId())).thenReturn(Optional.of(parent));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.memberPermissions());
        when(taskRepository.findByParentId(parent.getId())).thenReturn(List.of(child));

        var result = service.getSubtasks(parent.getId(), callerId);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).parentId()).isEqualTo(parent.getId());
        verify(projectServiceClient).getMemberPermissions(projectId, callerId);
    }

    @Test
    void toggleSubtaskDone_marksSubtaskAsDone() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Task subtask = TestDataFactory.subtask(projectId, callerId, UUID.randomUUID());

        when(taskRepository.findById(subtask.getId())).thenReturn(Optional.of(subtask));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.memberPermissions());
        when(boardColumnService.getDoneEquivalentStatuses(projectId)).thenReturn(Set.of("DONE"));
        when(taskRepository.save(subtask)).thenReturn(subtask);

        var result = service.toggleSubtaskDone(subtask.getId(), callerId);

        assertThat(subtask.getStatus()).isEqualTo("DONE");
        assertThat(subtask.getCompletedAt()).isNotNull();
    }

    @Test
    void toggleSubtaskDone_undoneSubtask() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Task subtask = TestDataFactory.subtask(projectId, callerId, UUID.randomUUID());
        subtask.setStatus("DONE");

        when(taskRepository.findById(subtask.getId())).thenReturn(Optional.of(subtask));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.memberPermissions());
        when(boardColumnService.getDoneEquivalentStatuses(projectId)).thenReturn(Set.of("DONE"));
        when(boardColumnService.getFirstColumnName(projectId)).thenReturn("TODO");
        when(taskRepository.save(subtask)).thenReturn(subtask);

        var result = service.toggleSubtaskDone(subtask.getId(), callerId);

        assertThat(subtask.getStatus()).isEqualTo("TODO");
        assertThat(subtask.getCompletedAt()).isNull();
    }

    @Test
    void toggleSubtaskDone_throwsWhenNotSubtask() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Task task = TestDataFactory.task(projectId, callerId);

        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));

        assertThatThrownBy(() -> service.toggleSubtaskDone(task.getId(), callerId))
                .isInstanceOf(ConflictException.class)
                .hasMessage("NOT_A_SUBTASK");
    }
}