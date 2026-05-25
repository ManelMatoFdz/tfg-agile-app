package com.tfg.agile.app.task_service.service;

import com.tfg.agile.app.task_service.client.ProjectServiceClient;
import com.tfg.agile.app.task_service.dto.AssignTaskToSprintRequestDto;
import com.tfg.agile.app.task_service.dto.CompleteSprintRequestDto;
import com.tfg.agile.app.task_service.dto.CreateSprintRequestDto;
import com.tfg.agile.app.task_service.dto.UpdateSprintRequestDto;
import com.tfg.agile.app.task_service.entity.Sprint;
import com.tfg.agile.app.task_service.entity.SprintStatus;
import com.tfg.agile.app.task_service.entity.Task;
import com.tfg.agile.app.task_service.entity.TaskStatus;
import com.tfg.agile.app.task_service.exception.ConflictException;
import com.tfg.agile.app.task_service.exception.ForbiddenException;
import com.tfg.agile.app.task_service.exception.ResourceNotFoundException;
import com.tfg.agile.app.task_service.repository.SprintRepository;
import com.tfg.agile.app.task_service.repository.SprintTaskSnapshotRepository;
import com.tfg.agile.app.task_service.repository.TaskRepository;
import com.tfg.agile.app.task_service.support.TestDataFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SprintServiceTest {

    @Mock
    private SprintRepository sprintRepository;
    @Mock
    private TaskRepository taskRepository;
    @Mock
    private SprintTaskSnapshotRepository snapshotRepository;
    @Mock
    private ProjectServiceClient projectServiceClient;

    private SprintService service;

    @BeforeEach
    void setUp() {
        service = new SprintService(sprintRepository, taskRepository, snapshotRepository, projectServiceClient);
    }

    @Test
    void getBacklog_requiresMembershipAndReturnsTasks() {
        UUID projectId = UUID.randomUUID();
        UUID callerId = UUID.randomUUID();
        Task task = TestDataFactory.task(projectId, UUID.randomUUID());

        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.memberPermissions());
        when(taskRepository.findByProjectIdAndSprintIdIsNullOrderByPriorityDescPositionAsc(projectId)).thenReturn(List.of(task));

        var response = service.getBacklog(projectId, callerId);

        assertThat(response).hasSize(1);
        assertThat(response.get(0).id()).isEqualTo(task.getId());
    }

    @Test
    void listSprints_returnsProjectSprintsForMember() {
        UUID projectId = UUID.randomUUID();
        UUID callerId = UUID.randomUUID();
        Sprint sprint = TestDataFactory.sprint(projectId);

        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.memberPermissions());
        when(sprintRepository.findByProjectIdOrderByCreatedAtAsc(projectId)).thenReturn(List.of(sprint));

        var response = service.listSprints(projectId, callerId);

        assertThat(response).hasSize(1);
        assertThat(response.get(0).id()).isEqualTo(sprint.getId());
    }

    @Test
    void getSprint_throwsWhenSprintDoesNotExist() {
        UUID sprintId = UUID.randomUUID();

        when(sprintRepository.findById(sprintId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getSprint(sprintId, UUID.randomUUID()))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("SPRINT_NOT_FOUND");
    }

    @Test
    void getSprintTasks_returnsTasksWhenCallerIsMember() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Sprint sprint = TestDataFactory.sprint(projectId);
        Task task = TestDataFactory.task(projectId, UUID.randomUUID());
        task.setSprintId(sprint.getId());

        when(sprintRepository.findById(sprint.getId())).thenReturn(Optional.of(sprint));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.memberPermissions());
        when(taskRepository.findBySprintIdOrderByStatusAscPositionAsc(sprint.getId())).thenReturn(List.of(task));

        var response = service.getSprintTasks(sprint.getId(), callerId);

        assertThat(response).hasSize(1);
        assertThat(response.get(0).sprintId()).isEqualTo(sprint.getId());
    }

    @Test
    void createSprint_requiresScrumMasterOrAdmin() {
        UUID projectId = UUID.randomUUID();
        UUID callerId = UUID.randomUUID();

        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.memberPermissions());

        assertThatThrownBy(() -> service.createSprint(projectId,
                new CreateSprintRequestDto("Sprint", "Goal", LocalDate.now(), LocalDate.now().plusDays(14)),
                callerId))
                .isInstanceOf(ForbiddenException.class)
                .hasMessage("SCRUM_MASTER_OR_ADMIN_REQUIRED");
    }

    @Test
    void createSprint_persistsSprintForScrumMaster() {
        UUID projectId = UUID.randomUUID();
        UUID callerId = UUID.randomUUID();
        Sprint sprint = TestDataFactory.sprint(projectId);

        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.scrumMasterPermissions());
        when(sprintRepository.save(any(Sprint.class))).thenReturn(sprint);

        var response = service.createSprint(projectId,
                new CreateSprintRequestDto("Sprint", "Goal", LocalDate.now(), LocalDate.now().plusDays(14)),
                callerId);

        assertThat(response.id()).isEqualTo(sprint.getId());
    }

    @Test
    void updateSprint_throwsForCompletedSprint() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Sprint sprint = TestDataFactory.sprint(projectId);
        sprint.setStatus(SprintStatus.COMPLETED);

        when(sprintRepository.findById(sprint.getId())).thenReturn(Optional.of(sprint));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.adminPermissions());

        assertThatThrownBy(() -> service.updateSprint(sprint.getId(),
                new UpdateSprintRequestDto("Name", "Goal", LocalDate.now(), LocalDate.now().plusDays(7), null),
                callerId))
                .isInstanceOf(ForbiddenException.class)
                .hasMessage("CANNOT_EDIT_COMPLETED_SPRINT");
    }

    @Test
    void activateSprint_throwsWhenSprintIsNotPlanning() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Sprint sprint = TestDataFactory.sprint(projectId);
        sprint.setStatus(SprintStatus.ACTIVE);

        when(sprintRepository.findById(sprint.getId())).thenReturn(Optional.of(sprint));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.adminPermissions());

        assertThatThrownBy(() -> service.activateSprint(sprint.getId(), callerId))
                .isInstanceOf(ConflictException.class)
                .hasMessage("SPRINT_NOT_PLANNING");
    }

    @Test
    void activateSprint_throwsWhenThereIsAnotherActiveSprint() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Sprint sprint = TestDataFactory.sprint(projectId);

        when(sprintRepository.findById(sprint.getId())).thenReturn(Optional.of(sprint));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.adminPermissions());
        when(sprintRepository.existsByProjectIdAndStatus(projectId, SprintStatus.ACTIVE)).thenReturn(true);

        assertThatThrownBy(() -> service.activateSprint(sprint.getId(), callerId))
                .isInstanceOf(ConflictException.class)
                .hasMessage("SPRINT_ALREADY_ACTIVE");
    }

    @Test
    void activateSprint_setsStatusActiveWhenValid() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Sprint sprint = TestDataFactory.sprint(projectId);

        when(sprintRepository.findById(sprint.getId())).thenReturn(Optional.of(sprint));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.scrumMasterPermissions());
        when(sprintRepository.existsByProjectIdAndStatus(projectId, SprintStatus.ACTIVE)).thenReturn(false);
        when(sprintRepository.save(sprint)).thenReturn(sprint);

        var response = service.activateSprint(sprint.getId(), callerId);

        assertThat(response.status()).isEqualTo(SprintStatus.ACTIVE);
    }

    @Test
    void completeSprint_throwsWhenSprintIsNotActive() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Sprint sprint = TestDataFactory.sprint(projectId);

        when(sprintRepository.findById(sprint.getId())).thenReturn(Optional.of(sprint));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.adminPermissions());

        assertThatThrownBy(() -> service.completeSprint(sprint.getId(), null, callerId))
                .isInstanceOf(ConflictException.class)
                .hasMessage("SPRINT_NOT_ACTIVE");
    }

    @Test
    void completeSprint_movesOpenTasksToBacklogAndCompletesSprint() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Sprint sprint = TestDataFactory.sprint(projectId);
        sprint.setStatus(SprintStatus.ACTIVE);

        Task openTask = TestDataFactory.task(projectId, UUID.randomUUID());
        openTask.setSprintId(sprint.getId());
        openTask.setStatus(TaskStatus.IN_PROGRESS);

        Task doneTask = TestDataFactory.task(projectId, UUID.randomUUID());
        doneTask.setSprintId(sprint.getId());
        doneTask.setStatus(TaskStatus.DONE);

        when(sprintRepository.findById(sprint.getId())).thenReturn(Optional.of(sprint));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.adminPermissions());
        when(taskRepository.findBySprintIdOrderByStatusAscPositionAsc(sprint.getId())).thenReturn(List.of(openTask, doneTask));
        when(taskRepository.save(any(Task.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(sprintRepository.save(sprint)).thenReturn(sprint);

        var response = service.completeSprint(sprint.getId(), null, callerId);

        assertThat(response.status()).isEqualTo(SprintStatus.COMPLETED);
        assertThat(openTask.getSprintId()).isNull();
        assertThat(openTask.getStatus()).isEqualTo(TaskStatus.TODO);
        assertThat(doneTask.getSprintId()).isEqualTo(sprint.getId());
    }

    @Test
    void completeSprint_savesReviewNotesWhenProvided() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Sprint sprint = TestDataFactory.sprint(projectId);
        sprint.setStatus(SprintStatus.ACTIVE);

        when(sprintRepository.findById(sprint.getId())).thenReturn(Optional.of(sprint));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.scrumMasterPermissions());
        when(taskRepository.findBySprintIdOrderByStatusAscPositionAsc(sprint.getId())).thenReturn(List.of());
        when(sprintRepository.save(sprint)).thenReturn(sprint);

        service.completeSprint(sprint.getId(), new CompleteSprintRequestDto("Great sprint!"), callerId);

        assertThat(sprint.getReviewNotes()).isEqualTo("Great sprint!");
    }

    @Test
    void activateSprint_throwsForProductOwner() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Sprint sprint = TestDataFactory.sprint(projectId);

        when(sprintRepository.findById(sprint.getId())).thenReturn(Optional.of(sprint));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.productOwnerPermissions());

        assertThatThrownBy(() -> service.activateSprint(sprint.getId(), callerId))
                .isInstanceOf(ForbiddenException.class)
                .hasMessage("SCRUM_MASTER_OR_ADMIN_REQUIRED");
    }

    @Test
    void completeSprint_throwsForProductOwner() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Sprint sprint = TestDataFactory.sprint(projectId);
        sprint.setStatus(SprintStatus.ACTIVE);

        when(sprintRepository.findById(sprint.getId())).thenReturn(Optional.of(sprint));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.productOwnerPermissions());

        assertThatThrownBy(() -> service.completeSprint(sprint.getId(), null, callerId))
                .isInstanceOf(ForbiddenException.class)
                .hasMessage("SCRUM_MASTER_OR_ADMIN_REQUIRED");
    }

    @Test
    void deleteSprint_throwsForNonScrumMaster() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Sprint sprint = TestDataFactory.sprint(projectId);

        when(sprintRepository.findById(sprint.getId())).thenReturn(Optional.of(sprint));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.productOwnerPermissions());

        assertThatThrownBy(() -> service.deleteSprint(sprint.getId(), callerId))
                .isInstanceOf(ForbiddenException.class)
                .hasMessage("SCRUM_MASTER_OR_ADMIN_REQUIRED");
    }

    @Test
    void deleteSprint_throwsWhenSprintIsNotPlanning() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Sprint sprint = TestDataFactory.sprint(projectId);
        sprint.setStatus(SprintStatus.ACTIVE);

        when(sprintRepository.findById(sprint.getId())).thenReturn(Optional.of(sprint));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.scrumMasterPermissions());

        assertThatThrownBy(() -> service.deleteSprint(sprint.getId(), callerId))
                .isInstanceOf(ForbiddenException.class)
                .hasMessage("ONLY_PLANNING_SPRINTS_CAN_BE_DELETED");
    }

    @Test
    void deleteSprint_returnsTasksToBacklogAndDeletesSprint() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Sprint sprint = TestDataFactory.sprint(projectId);
        Task task = TestDataFactory.task(projectId, UUID.randomUUID());
        task.setSprintId(sprint.getId());

        when(sprintRepository.findById(sprint.getId())).thenReturn(Optional.of(sprint));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.scrumMasterPermissions());
        when(taskRepository.findBySprintIdOrderByStatusAscPositionAsc(sprint.getId())).thenReturn(List.of(task));
        when(taskRepository.save(any(Task.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.deleteSprint(sprint.getId(), callerId);

        assertThat(task.getSprintId()).isNull();
        verify(sprintRepository).delete(sprint);
    }

    @Test
    void createSprint_rejectsEndDateBeforeStartDate() {
        UUID projectId = UUID.randomUUID();
        UUID callerId = UUID.randomUUID();

        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.scrumMasterPermissions());

        assertThatThrownBy(() -> service.createSprint(projectId,
                new CreateSprintRequestDto("Sprint", "Goal", LocalDate.now(), LocalDate.now().minusDays(1)),
                callerId))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("SPRINT_END_DATE_BEFORE_START_DATE");
    }

    @Test
    void updateSprint_rejectsEndDateBeforeStartDate() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Sprint sprint = TestDataFactory.sprint(projectId);

        when(sprintRepository.findById(sprint.getId())).thenReturn(Optional.of(sprint));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.scrumMasterPermissions());

        assertThatThrownBy(() -> service.updateSprint(sprint.getId(),
                new UpdateSprintRequestDto("Sprint", "Goal", LocalDate.now(), LocalDate.now().minusDays(1), null),
                callerId))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("SPRINT_END_DATE_BEFORE_START_DATE");
    }

    @Test
    void assignTasksToSprint_throwsForScrumMaster() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Sprint sprint = TestDataFactory.sprint(projectId);

        when(sprintRepository.findById(sprint.getId())).thenReturn(Optional.of(sprint));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.scrumMasterPermissions());

        assertThatThrownBy(() -> service.assignTasksToSprint(sprint.getId(),
                new AssignTaskToSprintRequestDto(List.of(UUID.randomUUID())),
                callerId))
                .isInstanceOf(ForbiddenException.class)
                .hasMessage("DEVELOPER_OR_PO_OR_ADMIN_REQUIRED");
    }

    @Test
    void assignTasksToSprint_throwsForViewer() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Sprint sprint = TestDataFactory.sprint(projectId);

        when(sprintRepository.findById(sprint.getId())).thenReturn(Optional.of(sprint));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.viewerPermissions());

        assertThatThrownBy(() -> service.assignTasksToSprint(sprint.getId(),
                new AssignTaskToSprintRequestDto(List.of(UUID.randomUUID())),
                callerId))
                .isInstanceOf(ForbiddenException.class)
                .hasMessage("DEVELOPER_OR_PO_OR_ADMIN_REQUIRED");
    }

    @Test
    void assignTasksToSprint_throwsWhenSprintIsCompleted() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Sprint sprint = TestDataFactory.sprint(projectId);
        sprint.setStatus(SprintStatus.COMPLETED);

        when(sprintRepository.findById(sprint.getId())).thenReturn(Optional.of(sprint));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.productOwnerPermissions());

        assertThatThrownBy(() -> service.assignTasksToSprint(sprint.getId(),
                new AssignTaskToSprintRequestDto(List.of(UUID.randomUUID())),
                callerId))
                .isInstanceOf(ForbiddenException.class)
                .hasMessage("CAN_ONLY_ADD_TASKS_TO_PLANNING_OR_ACTIVE_SPRINT");
    }

    @Test
    void assignTasksToSprint_throwsForProductOwnerOnActiveSprint() {
        // PO can only plan during PLANNING; during ACTIVE only Developer/Admin can pull work in
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Sprint sprint = TestDataFactory.sprint(projectId);
        sprint.setStatus(SprintStatus.ACTIVE);

        when(sprintRepository.findById(sprint.getId())).thenReturn(Optional.of(sprint));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.productOwnerPermissions());

        assertThatThrownBy(() -> service.assignTasksToSprint(sprint.getId(),
                new AssignTaskToSprintRequestDto(List.of(UUID.randomUUID())),
                callerId))
                .isInstanceOf(ForbiddenException.class)
                .hasMessage("DEVELOPER_OR_ADMIN_REQUIRED");
    }

    @Test
    void removeTaskFromSprint_throwsForProductOwnerOnActiveSprint() {
        // PO can only remove tasks during PLANNING; during ACTIVE only Developer/Admin can
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Sprint sprint = TestDataFactory.sprint(projectId);
        sprint.setStatus(SprintStatus.ACTIVE);
        Task task = TestDataFactory.task(projectId, UUID.randomUUID());
        task.setSprintId(sprint.getId());

        when(sprintRepository.findById(sprint.getId())).thenReturn(Optional.of(sprint));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.productOwnerPermissions());

        assertThatThrownBy(() -> service.removeTaskFromSprint(sprint.getId(), task.getId(), callerId))
                .isInstanceOf(ForbiddenException.class)
                .hasMessage("DEVELOPER_OR_ADMIN_REQUIRED");
    }

    @Test
    void assignTasksToSprint_throwsWhenTaskBelongsToAnotherProject() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        UUID otherProjectId = UUID.randomUUID();
        Sprint sprint = TestDataFactory.sprint(projectId);
        Task task = TestDataFactory.task(otherProjectId, UUID.randomUUID());

        when(sprintRepository.findById(sprint.getId())).thenReturn(Optional.of(sprint));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.productOwnerPermissions());
        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));

        assertThatThrownBy(() -> service.assignTasksToSprint(sprint.getId(),
                new AssignTaskToSprintRequestDto(List.of(task.getId())),
                callerId))
                .isInstanceOf(ForbiddenException.class)
                .hasMessage("TASK_WRONG_PROJECT");
    }

    @Test
    void assignTasksToSprint_addsTasksToSprint() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Sprint sprint = TestDataFactory.sprint(projectId);
        Task firstTask = TestDataFactory.task(projectId, UUID.randomUUID());
        Task secondTask = TestDataFactory.task(projectId, UUID.randomUUID());

        when(sprintRepository.findById(sprint.getId())).thenReturn(Optional.of(sprint));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.adminPermissions());
        when(taskRepository.findById(firstTask.getId())).thenReturn(Optional.of(firstTask));
        when(taskRepository.findById(secondTask.getId())).thenReturn(Optional.of(secondTask));
        when(taskRepository.save(any(Task.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = service.assignTasksToSprint(
                sprint.getId(),
                new AssignTaskToSprintRequestDto(List.of(firstTask.getId(), secondTask.getId())),
                callerId
        );

        assertThat(response).hasSize(2);
        assertThat(firstTask.getSprintId()).isEqualTo(sprint.getId());
        assertThat(secondTask.getSprintId()).isEqualTo(sprint.getId());
    }

    @Test
    void removeTaskFromSprint_throwsWhenTaskNotInSprint() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Sprint sprint = TestDataFactory.sprint(projectId);
        Task task = TestDataFactory.task(projectId, UUID.randomUUID());
        task.setSprintId(UUID.randomUUID());

        when(sprintRepository.findById(sprint.getId())).thenReturn(Optional.of(sprint));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.productOwnerPermissions());
        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));

        assertThatThrownBy(() -> service.removeTaskFromSprint(sprint.getId(), task.getId(), callerId))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("TASK_NOT_IN_SPRINT");
    }

    @Test
    void removeTaskFromSprint_clearsSprintId() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Sprint sprint = TestDataFactory.sprint(projectId);
        Task task = TestDataFactory.task(projectId, UUID.randomUUID());
        task.setSprintId(sprint.getId());

        when(sprintRepository.findById(sprint.getId())).thenReturn(Optional.of(sprint));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.productOwnerPermissions());
        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));
        when(taskRepository.save(task)).thenReturn(task);

        var response = service.removeTaskFromSprint(sprint.getId(), task.getId(), callerId);

        assertThat(response.sprintId()).isNull();
        verify(taskRepository).save(task);
    }
}

