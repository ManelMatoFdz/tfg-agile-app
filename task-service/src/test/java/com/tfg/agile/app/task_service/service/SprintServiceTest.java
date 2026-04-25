package com.tfg.agile.app.task_service.service;

import com.tfg.agile.app.task_service.client.ProjectServiceClient;
import com.tfg.agile.app.task_service.dto.AssignTaskToSprintRequestDto;
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
    private ProjectServiceClient projectServiceClient;

    private SprintService service;

    @BeforeEach
    void setUp() {
        service = new SprintService(sprintRepository, taskRepository, projectServiceClient);
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
                .hasMessage("Sprint not found");
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
                .hasMessage("Scrum Master or Admin role required");
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
                new UpdateSprintRequestDto("Name", "Goal", LocalDate.now(), LocalDate.now().plusDays(7)),
                callerId))
                .isInstanceOf(ForbiddenException.class)
                .hasMessage("Cannot edit a completed sprint");
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
                .hasMessage("Only PLANNING sprints can be activated");
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
                .hasMessage("There is already an active sprint for this project");
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

        assertThatThrownBy(() -> service.completeSprint(sprint.getId(), callerId))
                .isInstanceOf(ConflictException.class)
                .hasMessage("Only ACTIVE sprints can be completed");
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

        var response = service.completeSprint(sprint.getId(), callerId);

        assertThat(response.status()).isEqualTo(SprintStatus.COMPLETED);
        assertThat(openTask.getSprintId()).isNull();
        assertThat(openTask.getStatus()).isEqualTo(TaskStatus.TODO);
        assertThat(doneTask.getSprintId()).isEqualTo(sprint.getId());
    }

    @Test
    void assignTasksToSprint_requiresPoSmOrAdmin() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Sprint sprint = TestDataFactory.sprint(projectId);

        when(sprintRepository.findById(sprint.getId())).thenReturn(Optional.of(sprint));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.memberPermissions());

        assertThatThrownBy(() -> service.assignTasksToSprint(sprint.getId(),
                new AssignTaskToSprintRequestDto(List.of(UUID.randomUUID())),
                callerId))
                .isInstanceOf(ForbiddenException.class)
                .hasMessage("Product Owner, Scrum Master, or Admin role required");
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
                .hasMessage("Cannot add tasks to a completed sprint");
    }

    @Test
    void assignTasksToSprint_throwsWhenTaskBelongsToAnotherProject() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        UUID otherProjectId = UUID.randomUUID();
        Sprint sprint = TestDataFactory.sprint(projectId);
        Task task = TestDataFactory.task(otherProjectId, UUID.randomUUID());

        when(sprintRepository.findById(sprint.getId())).thenReturn(Optional.of(sprint));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.scrumMasterPermissions());
        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));

        assertThatThrownBy(() -> service.assignTasksToSprint(sprint.getId(),
                new AssignTaskToSprintRequestDto(List.of(task.getId())),
                callerId))
                .isInstanceOf(ForbiddenException.class)
                .hasMessage("Task does not belong to this project");
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
                .hasMessage("Task is not in this sprint");
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

