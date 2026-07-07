package com.tfg.agile.app.task_service.service;

import com.tfg.agile.app.task_service.client.MemberPermissionsDto;
import com.tfg.agile.app.task_service.client.ProjectServiceClient;
import com.tfg.agile.app.task_service.dto.*;
import com.tfg.agile.app.task_service.entity.Sprint;
import com.tfg.agile.app.task_service.entity.SprintStatus;
import com.tfg.agile.app.task_service.entity.SprintTaskSnapshot;
import com.tfg.agile.app.task_service.entity.Task;
import com.tfg.agile.app.task_service.entity.TaskStatus;
import com.tfg.agile.app.task_service.exception.ConflictException;
import com.tfg.agile.app.task_service.exception.ForbiddenException;
import com.tfg.agile.app.task_service.exception.ResourceNotFoundException;
import com.tfg.agile.app.task_service.repository.SprintRepository;
import com.tfg.agile.app.task_service.repository.SprintTaskSnapshotRepository;
import com.tfg.agile.app.task_service.repository.TaskRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
public class SprintService {

    private final SprintRepository sprintRepository;
    private final TaskRepository taskRepository;
    private final SprintTaskSnapshotRepository snapshotRepository;
    private final ProjectServiceClient projectServiceClient;

    public SprintService(SprintRepository sprintRepository,
                         TaskRepository taskRepository,
                         SprintTaskSnapshotRepository snapshotRepository,
                         ProjectServiceClient projectServiceClient) {
        this.sprintRepository = sprintRepository;
        this.taskRepository = taskRepository;
        this.snapshotRepository = snapshotRepository;
        this.projectServiceClient = projectServiceClient;
    }

    // ── Backlog ───────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<TaskResponseDto> getBacklog(UUID projectId, UUID callerId) {
        requireMember(projectId, callerId);
        return taskRepository.findByProjectIdAndSprintIdIsNullOrderByPriorityDescPositionAsc(projectId).stream()
                .map(TaskResponseDto::from)
                .toList();
    }

    // ── Sprints ───────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<SprintResponseDto> listSprints(UUID projectId, UUID callerId) {
        requireMember(projectId, callerId);
        return sprintRepository.findByProjectIdOrderByCreatedAtAsc(projectId).stream()
                .map(SprintResponseDto::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public SprintResponseDto getSprint(UUID sprintId, UUID callerId) {
        Sprint sprint = getSprintOrThrow(sprintId);
        requireMember(sprint.getProjectId(), callerId);
        return SprintResponseDto.from(sprint);
    }

    @Transactional(readOnly = true)
    public List<TaskResponseDto> getSprintTasks(UUID sprintId, UUID callerId) {
        Sprint sprint = getSprintOrThrow(sprintId);
        requireMember(sprint.getProjectId(), callerId);
        return taskRepository.findBySprintIdOrderByStatusAscPositionAsc(sprintId).stream()
                .map(TaskResponseDto::from)
                .toList();
    }

    @Transactional
    public SprintResponseDto createSprint(UUID projectId, CreateSprintRequestDto dto, UUID callerId) {
        MemberPermissionsDto perms = requireMember(projectId, callerId);
        requireScrumMasterOrAdmin(perms);

        validateDateRange(dto.startDate(), dto.endDate());

        Sprint sprint = Sprint.builder()
                .projectId(projectId)
                .name(dto.name())
                .goal(dto.goal())
                .startDate(dto.startDate())
                .endDate(dto.endDate())
                .build();
        SprintResponseDto result = SprintResponseDto.from(sprintRepository.save(sprint));
        projectServiceClient.touchProject(projectId);
        projectServiceClient.touchMemberActivity(projectId, callerId);
        return result;
    }

    @Transactional
    public SprintResponseDto updateSprint(UUID sprintId, UpdateSprintRequestDto dto, UUID callerId) {
        Sprint sprint = getSprintOrThrow(sprintId);
        MemberPermissionsDto perms = requireMember(sprint.getProjectId(), callerId);
        requireScrumMasterOrAdmin(perms);

        if (sprint.getStatus() == SprintStatus.COMPLETED) {
            throw new ForbiddenException("CANNOT_EDIT_COMPLETED_SPRINT");
        }

        validateDateRange(dto.startDate(), dto.endDate());

        sprint.setName(dto.name());
        sprint.setGoal(dto.goal());
        sprint.setStartDate(dto.startDate());
        sprint.setEndDate(dto.endDate());
        if (dto.reviewNotes() != null) {
            sprint.setReviewNotes(dto.reviewNotes());
        }
        SprintResponseDto result = SprintResponseDto.from(sprintRepository.save(sprint));
        projectServiceClient.touchProject(sprint.getProjectId());
        projectServiceClient.touchMemberActivity(sprint.getProjectId(), callerId);
        return result;
    }

    @Transactional
    public SprintResponseDto activateSprint(UUID sprintId, UUID callerId) {
        Sprint sprint = getSprintOrThrow(sprintId);
        MemberPermissionsDto perms = requireMember(sprint.getProjectId(), callerId);
        requireScrumMasterOrAdmin(perms);

        if (sprint.getStatus() != SprintStatus.PLANNING) {
            throw new ConflictException("SPRINT_NOT_PLANNING");
        }
        if (sprint.getEndDate() == null) {
            throw new IllegalArgumentException("SPRINT_END_DATE_REQUIRED");
        }
        if (sprint.getEndDate().isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("SPRINT_END_DATE_IN_PAST");
        }
        if (sprintRepository.existsByProjectIdAndStatus(sprint.getProjectId(), SprintStatus.ACTIVE)) {
            throw new ConflictException("SPRINT_ALREADY_ACTIVE");
        }

        sprint.setStatus(SprintStatus.ACTIVE);
        sprint.setStartDate(LocalDate.now());
        SprintResponseDto result = SprintResponseDto.from(sprintRepository.save(sprint));
        projectServiceClient.touchProject(sprint.getProjectId());
        projectServiceClient.touchMemberActivity(sprint.getProjectId(), callerId);
        return result;
    }

    /**
     * Internal method that performs the actual sprint completion logic.
     * Used by the scheduler for automatic closure at endDate.
     */
    @Transactional
    public void completeSprintInternal(Sprint sprint) {
        UUID sprintId = sprint.getId();
        List<Task> allSprintTasks = taskRepository.findBySprintIdOrderByStatusAscPositionAsc(sprintId);

        int closedTotal = allSprintTasks.size();
        int closedDone = (int) allSprintTasks.stream().filter(t -> t.getStatus() == TaskStatus.DONE).count();
        int closedTotalSP = allSprintTasks.stream().mapToInt(t -> t.getStoryPoints() != null ? t.getStoryPoints() : 0).sum();
        int closedDoneSP = allSprintTasks.stream().filter(t -> t.getStatus() == TaskStatus.DONE).mapToInt(t -> t.getStoryPoints() != null ? t.getStoryPoints() : 0).sum();

        sprint.setClosedTotalTasks(closedTotal);
        sprint.setClosedDoneTasks(closedDone);
        sprint.setClosedIncompleteTasks(closedTotal - closedDone);
        sprint.setClosedTotalStoryPoints(closedTotalSP);
        sprint.setClosedDoneStoryPoints(closedDoneSP);

        List<SprintTaskSnapshot> snapshots = allSprintTasks.stream()
                .map(t -> SprintTaskSnapshot.builder()
                        .sprintId(sprintId)
                        .taskId(t.getId())
                        .title(t.getTitle())
                        .description(t.getDescription())
                        .statusAtEnd(t.getStatus())
                        .priority(t.getPriority())
                        .dueDate(t.getDueDate())
                        .completedAt(t.getCompletedAt())
                        .storyPoints(t.getStoryPoints())
                        .completed(t.getStatus() == TaskStatus.DONE)
                        .returnedToBacklog(t.getStatus() != TaskStatus.DONE)
                        .build())
                .toList();
        snapshotRepository.saveAll(snapshots);

        allSprintTasks.stream()
                .filter(t -> t.getStatus() != TaskStatus.DONE)
                .forEach(t -> {
                    t.setSprintId(null);
                    t.setStatus(TaskStatus.TODO);
                    taskRepository.save(t);
                });

        sprint.setStatus(SprintStatus.COMPLETED);
        sprintRepository.save(sprint);
        projectServiceClient.touchProject(sprint.getProjectId());
    }

    @Transactional
    public void deleteSprint(UUID sprintId, UUID callerId) {
        Sprint sprint = getSprintOrThrow(sprintId);
        MemberPermissionsDto perms = requireMember(sprint.getProjectId(), callerId);
        requireScrumMasterOrAdmin(perms);

        if (sprint.getStatus() != SprintStatus.PLANNING) {
            throw new ForbiddenException("ONLY_PLANNING_SPRINTS_CAN_BE_DELETED");
        }

        taskRepository.findBySprintIdOrderByStatusAscPositionAsc(sprintId)
                .forEach(t -> {
                    t.setSprintId(null);
                    taskRepository.save(t);
                });

        UUID projectId = sprint.getProjectId();
        sprintRepository.delete(sprint);
        projectServiceClient.touchProject(projectId);
        projectServiceClient.touchMemberActivity(projectId, callerId);
    }

    @Transactional
    public List<TaskResponseDto> assignTasksToSprint(UUID sprintId, AssignTaskToSprintRequestDto dto, UUID callerId) {
        Sprint sprint = getSprintOrThrow(sprintId);
        MemberPermissionsDto perms = requireMember(sprint.getProjectId(), callerId);

        if (sprint.getStatus() == SprintStatus.PLANNING) {
            requireDeveloperOrPOOrAdmin(perms);
        } else if (sprint.getStatus() == SprintStatus.ACTIVE) {
            requireDeveloperOrAdmin(perms);
        } else {
            throw new ForbiddenException("CAN_ONLY_ADD_TASKS_TO_PLANNING_OR_ACTIVE_SPRINT");
        }

        List<TaskResponseDto> result = dto.taskIds().stream()
                .map(taskId -> {
                    Task task = taskRepository.findById(taskId)
                            .orElseThrow(() -> new ResourceNotFoundException("TASK_NOT_FOUND"));
                    if (!task.getProjectId().equals(sprint.getProjectId())) {
                        throw new ForbiddenException("TASK_WRONG_PROJECT");
                    }
                    task.setSprintId(sprintId);
                    return TaskResponseDto.from(taskRepository.save(task));
                })
                .toList();
        projectServiceClient.touchProject(sprint.getProjectId());
        projectServiceClient.touchMemberActivity(sprint.getProjectId(), callerId);
        return result;
    }

    @Transactional
    public TaskResponseDto removeTaskFromSprint(UUID sprintId, UUID taskId, UUID callerId) {
        Sprint sprint = getSprintOrThrow(sprintId);
        MemberPermissionsDto perms = requireMember(sprint.getProjectId(), callerId);

        if (sprint.getStatus() == SprintStatus.PLANNING) {
            requireDeveloperOrPOOrAdmin(perms);
        } else if (sprint.getStatus() == SprintStatus.ACTIVE) {
            requireDeveloperOrAdmin(perms);
        } else {
            throw new ForbiddenException("CAN_ONLY_REMOVE_TASKS_FROM_PLANNING_OR_ACTIVE_SPRINT");
        }

        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("TASK_NOT_FOUND"));
        if (!sprintId.equals(task.getSprintId())) {
            throw new ResourceNotFoundException("TASK_NOT_IN_SPRINT");
        }
        task.setSprintId(null);
        TaskResponseDto result = TaskResponseDto.from(taskRepository.save(task));
        projectServiceClient.touchProject(sprint.getProjectId());
        projectServiceClient.touchMemberActivity(sprint.getProjectId(), callerId);
        return result;
    }

    @Transactional(readOnly = true)
    public List<SprintTaskSnapshotDto> getSprintSnapshots(UUID sprintId, UUID callerId) {
        Sprint sprint = getSprintOrThrow(sprintId);
        requireMember(sprint.getProjectId(), callerId);
        return snapshotRepository.findBySprintId(sprintId).stream()
                .map(SprintTaskSnapshotDto::from)
                .toList();
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private Sprint getSprintOrThrow(UUID id) {
        return sprintRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("SPRINT_NOT_FOUND"));
    }

    private MemberPermissionsDto requireMember(UUID projectId, UUID userId) {
        return projectServiceClient.getMemberPermissions(projectId, userId);
    }

    private boolean isAdmin(MemberPermissionsDto p) {
        return p.workspaceAdmin() || p.teamAdmin();
    }

    private void requireScrumMasterOrAdmin(MemberPermissionsDto p) {
        if (isAdmin(p)) return;
        if ("SCRUM_MASTER".equals(p.scrumRole())) return;
        throw new ForbiddenException("SCRUM_MASTER_OR_ADMIN_REQUIRED");
    }

    private void requireDeveloperOrAdmin(MemberPermissionsDto p) {
        if (isAdmin(p)) return;
        if ("DEVELOPER".equals(p.scrumRole())) return;
        if (p.scrumRole() == null) return; // Member without scrum role = Developer
        throw new ForbiddenException("DEVELOPER_OR_ADMIN_REQUIRED");
    }

    private void requireDeveloperOrPOOrAdmin(MemberPermissionsDto p) {
        if (isAdmin(p)) return;
        if ("PRODUCT_OWNER".equals(p.scrumRole())) return;
        if (!"SCRUM_MASTER".equals(p.scrumRole())) return; // Developer or no role = allowed
        throw new ForbiddenException("DEVELOPER_OR_PO_OR_ADMIN_REQUIRED");
    }

    private void validateDateRange(LocalDate startDate, LocalDate endDate) {
        if (startDate != null && endDate != null && endDate.isBefore(startDate)) {
            throw new IllegalArgumentException("SPRINT_END_DATE_BEFORE_START_DATE");
        }
    }
}