package com.tfg.agile.app.task_service.service;

import com.tfg.agile.app.task_service.client.ProjectServiceClient;
import com.tfg.agile.app.task_service.dto.CreateEpicRequestDto;
import com.tfg.agile.app.task_service.dto.UpdateEpicRequestDto;
import com.tfg.agile.app.task_service.entity.Epic;
import com.tfg.agile.app.task_service.entity.EpicStatus;
import com.tfg.agile.app.task_service.entity.Task;
import com.tfg.agile.app.task_service.entity.TaskActivityType;
import com.tfg.agile.app.task_service.exception.ConflictException;
import com.tfg.agile.app.task_service.exception.ForbiddenException;
import com.tfg.agile.app.task_service.exception.ResourceNotFoundException;
import com.tfg.agile.app.task_service.repository.EpicRepository;
import com.tfg.agile.app.task_service.repository.TaskRepository;
import com.tfg.agile.app.task_service.support.TestDataFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.LocalDate;
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
class EpicServiceTest {

    @Mock
    private EpicRepository epicRepository;
    @Mock
    private TaskRepository taskRepository;
    @Mock
    private ProjectServiceClient projectServiceClient;
    @Mock
    private BoardColumnService boardColumnService;
    @Mock
    private ActivityService activityService;

    private EpicService service;

    @BeforeEach
    void setUp() {
        service = new EpicService(epicRepository, taskRepository, projectServiceClient, boardColumnService, activityService);
    }

    @Test
    void findByProject_returnsEpicsWithProgressCounts() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Epic epic = epic(projectId, "Release 1");

        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.memberPermissions());
        when(epicRepository.findByProjectIdOrderByNameAsc(projectId)).thenReturn(List.of(epic));
        when(boardColumnService.getDoneEquivalentStatuses(projectId)).thenReturn(Set.of("DONE", "CLOSED"));
        when(taskRepository.countByEpicId(epic.getId())).thenReturn(5);
        when(taskRepository.countByEpicIdAndStatusIn(epic.getId(), Set.of("DONE", "CLOSED"))).thenReturn(3);

        var result = service.findByProject(projectId, callerId);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).name()).isEqualTo("Release 1");
        assertThat(result.get(0).totalTasks()).isEqualTo(5);
        assertThat(result.get(0).doneTasks()).isEqualTo(3);
    }

    @Test
    void findById_throwsWhenEpicDoesNotExist() {
        UUID epicId = UUID.randomUUID();

        when(epicRepository.findById(epicId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.findById(epicId, UUID.randomUUID()))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("EPIC_NOT_FOUND");
    }

    @Test
    void findTasksByEpic_returnsTasksWithEpicInfo() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Epic epic = epic(projectId, "Platform");
        Task task = TestDataFactory.task(projectId, UUID.randomUUID());
        task.setEpicId(epic.getId());

        when(epicRepository.findById(epic.getId())).thenReturn(Optional.of(epic));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.memberPermissions());
        when(taskRepository.findByEpicIdOrderByPositionAsc(epic.getId())).thenReturn(List.of(task));

        var result = service.findTasksByEpic(epic.getId(), callerId);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).epicId()).isEqualTo(epic.getId());
        assertThat(result.get(0).epicName()).isEqualTo("Platform");
        assertThat(result.get(0).epicColor()).isEqualTo(epic.getColor());
    }

    @Test
    void create_defaultsColorAndTouchesProject() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();

        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.productOwnerPermissions());
        when(epicRepository.save(any(Epic.class))).thenAnswer(invocation -> {
            Epic saved = invocation.getArgument(0);
            saved.setId(UUID.randomUUID());
            saved.setCreatedAt(Instant.parse("2026-09-04T10:00:00Z"));
            saved.setUpdatedAt(Instant.parse("2026-09-04T10:00:00Z"));
            return saved;
        });

        var result = service.create(projectId,
                new CreateEpicRequestDto("Reporting", "KPIs", null, LocalDate.of(2026, 9, 1), LocalDate.of(2026, 9, 30)),
                callerId);

        assertThat(result.name()).isEqualTo("Reporting");
        assertThat(result.color()).isEqualTo("#6B7280");
        assertThat(result.createdBy()).isEqualTo(callerId);
        verify(projectServiceClient).touchProject(projectId);
    }

    @Test
    void create_throwsWhenCallerCannotManageEpics() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();

        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.memberPermissions());

        assertThatThrownBy(() -> service.create(projectId,
                new CreateEpicRequestDto("Blocked", null, null, null, null),
                callerId))
                .isInstanceOf(ForbiddenException.class)
                .hasMessage("ONLY_PO_OR_ADMIN_CAN_MANAGE_EPICS");
    }

    @Test
    void update_updatesStatusAndKeepsColorWhenNull() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Epic epic = epic(projectId, "Legacy");
        epic.setColor("#123456");

        when(epicRepository.findById(epic.getId())).thenReturn(Optional.of(epic));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.adminPermissions());
        when(epicRepository.save(any(Epic.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(boardColumnService.getDoneEquivalentStatuses(projectId)).thenReturn(Set.of("DONE"));
        when(taskRepository.countByEpicId(epic.getId())).thenReturn(4);
        when(taskRepository.countByEpicIdAndStatusIn(epic.getId(), Set.of("DONE"))).thenReturn(1);

        var result = service.update(epic.getId(),
                new UpdateEpicRequestDto("Modernized", "New scope", null, "in_progress", LocalDate.of(2026, 9, 5), LocalDate.of(2026, 10, 5)),
                callerId);

        assertThat(result.name()).isEqualTo("Modernized");
        assertThat(result.status()).isEqualTo(EpicStatus.IN_PROGRESS);
        assertThat(result.color()).isEqualTo("#123456");
        assertThat(result.doneTasks()).isEqualTo(1);
        verify(projectServiceClient).touchProject(projectId);
    }

    @Test
    void delete_unlinksTasksAndDeletesEpic() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Epic epic = epic(projectId, "Cleanup");
        Task firstTask = TestDataFactory.task(projectId, UUID.randomUUID());
        Task secondTask = TestDataFactory.task(projectId, UUID.randomUUID());
        firstTask.setEpicId(epic.getId());
        secondTask.setEpicId(epic.getId());

        when(epicRepository.findById(epic.getId())).thenReturn(Optional.of(epic));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.teamAdminPermissions());
        when(taskRepository.findByEpicIdOrderByPositionAsc(epic.getId())).thenReturn(List.of(firstTask, secondTask));

        service.delete(epic.getId(), callerId);

        assertThat(firstTask.getEpicId()).isNull();
        assertThat(secondTask.getEpicId()).isNull();
        verify(taskRepository).saveAll(List.of(firstTask, secondTask));
        verify(epicRepository).delete(epic);
        verify(projectServiceClient).touchProject(projectId);
    }

    @Test
    void assignEpicToTask_assignsEpicAndRecordsActivity() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Task task = TestDataFactory.task(projectId, UUID.randomUUID());
        Epic epic = epic(projectId, "Observability");

        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.productOwnerPermissions());
        when(epicRepository.findById(epic.getId())).thenReturn(Optional.of(epic));
        when(taskRepository.save(any(Task.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var result = service.assignEpicToTask(task.getId(), epic.getId(), callerId);

        assertThat(result.epicId()).isEqualTo(epic.getId());
        assertThat(result.epicName()).isEqualTo("Observability");
        assertThat(result.epicColor()).isEqualTo(epic.getColor());
        verify(activityService).record(task.getId(), callerId, TaskActivityType.EPIC_CHANGED, null, "Observability");
    }

    @Test
    void assignEpicToTask_throwsWhenEpicBelongsToAnotherProject() {
        UUID callerId = UUID.randomUUID();
        Task task = TestDataFactory.task(UUID.randomUUID(), UUID.randomUUID());
        Epic epic = epic(UUID.randomUUID(), "Other project");

        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));
        when(projectServiceClient.getMemberPermissions(task.getProjectId(), callerId)).thenReturn(TestDataFactory.adminPermissions());
        when(epicRepository.findById(epic.getId())).thenReturn(Optional.of(epic));

        assertThatThrownBy(() -> service.assignEpicToTask(task.getId(), epic.getId(), callerId))
                .isInstanceOf(ConflictException.class)
                .hasMessage("EPIC_WRONG_PROJECT");
    }

    @Test
    void assignEpicToTask_doesNotRecordActivityWhenEpicDoesNotChange() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Epic epic = epic(projectId, "Analytics");
        Task task = TestDataFactory.task(projectId, UUID.randomUUID());
        task.setEpicId(epic.getId());

        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.teamAdminPermissions());
        when(epicRepository.findById(epic.getId())).thenReturn(Optional.of(epic));
        when(taskRepository.save(any(Task.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var result = service.assignEpicToTask(task.getId(), epic.getId(), callerId);

        assertThat(result.epicId()).isEqualTo(epic.getId());
        verify(activityService, never()).record(any(), any(), any(), any(), any());
    }

    private Epic epic(UUID projectId, String name) {
        return Epic.builder()
                .id(UUID.randomUUID())
                .projectId(projectId)
                .name(name)
                .description(name + " description")
                .color("#6B7280")
                .status(EpicStatus.OPEN)
                .createdBy(UUID.randomUUID())
                .createdAt(Instant.parse("2026-09-04T08:00:00Z"))
                .updatedAt(Instant.parse("2026-09-04T08:00:00Z"))
                .build();
    }
}
