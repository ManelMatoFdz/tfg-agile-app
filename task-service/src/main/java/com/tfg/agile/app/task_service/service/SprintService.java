package com.tfg.agile.app.task_service.service;

import com.tfg.agile.app.task_service.client.MemberPermissionsDto;
import com.tfg.agile.app.task_service.client.ProjectServiceClient;
import com.tfg.agile.app.task_service.dto.*;
import com.tfg.agile.app.task_service.entity.Sprint;
import com.tfg.agile.app.task_service.entity.SprintStatus;
import com.tfg.agile.app.task_service.entity.Task;
import com.tfg.agile.app.task_service.entity.TaskStatus;
import com.tfg.agile.app.task_service.exception.ConflictException;
import com.tfg.agile.app.task_service.exception.ForbiddenException;
import com.tfg.agile.app.task_service.exception.ResourceNotFoundException;
import com.tfg.agile.app.task_service.repository.SprintRepository;
import com.tfg.agile.app.task_service.repository.TaskRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class SprintService {

    private final SprintRepository sprintRepository;
    private final TaskRepository taskRepository;
    private final ProjectServiceClient projectServiceClient;

    public SprintService(SprintRepository sprintRepository,
                         TaskRepository taskRepository,
                         ProjectServiceClient projectServiceClient) {
        this.sprintRepository = sprintRepository;
        this.taskRepository = taskRepository;
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

        Sprint sprint = Sprint.builder()
                .projectId(projectId)
                .name(dto.name())
                .goal(dto.goal())
                .startDate(dto.startDate())
                .endDate(dto.endDate())
                .build();
        return SprintResponseDto.from(sprintRepository.save(sprint));
    }

    @Transactional
    public SprintResponseDto updateSprint(UUID sprintId, UpdateSprintRequestDto dto, UUID callerId) {
        Sprint sprint = getSprintOrThrow(sprintId);
        MemberPermissionsDto perms = requireMember(sprint.getProjectId(), callerId);
        requireScrumMasterOrAdmin(perms);

        if (sprint.getStatus() == SprintStatus.COMPLETED) {
            throw new ForbiddenException("Cannot edit a completed sprint");
        }

        sprint.setName(dto.name());
        sprint.setGoal(dto.goal());
        sprint.setStartDate(dto.startDate());
        sprint.setEndDate(dto.endDate());
        return SprintResponseDto.from(sprintRepository.save(sprint));
    }

    @Transactional
    public SprintResponseDto activateSprint(UUID sprintId, UUID callerId) {
        Sprint sprint = getSprintOrThrow(sprintId);
        MemberPermissionsDto perms = requireMember(sprint.getProjectId(), callerId);
        requireScrumMasterOrAdmin(perms);

        if (sprint.getStatus() != SprintStatus.PLANNING) {
            throw new ConflictException("Only PLANNING sprints can be activated");
        }
        if (sprintRepository.existsByProjectIdAndStatus(sprint.getProjectId(), SprintStatus.ACTIVE)) {
            throw new ConflictException("There is already an active sprint for this project");
        }

        sprint.setStatus(SprintStatus.ACTIVE);
        return SprintResponseDto.from(sprintRepository.save(sprint));
    }

    @Transactional
    public SprintResponseDto completeSprint(UUID sprintId, UUID callerId) {
        Sprint sprint = getSprintOrThrow(sprintId);
        MemberPermissionsDto perms = requireMember(sprint.getProjectId(), callerId);
        requireScrumMasterOrAdmin(perms);

        if (sprint.getStatus() != SprintStatus.ACTIVE) {
            throw new ConflictException("Only ACTIVE sprints can be completed");
        }

        // Move non-DONE tasks back to backlog
        taskRepository.findBySprintIdOrderByStatusAscPositionAsc(sprintId).stream()
                .filter(t -> t.getStatus() != TaskStatus.DONE)
                .forEach(t -> {
                    t.setSprintId(null);
                    t.setStatus(TaskStatus.TODO);
                    taskRepository.save(t);
                });

        sprint.setStatus(SprintStatus.COMPLETED);
        return SprintResponseDto.from(sprintRepository.save(sprint));
    }

    @Transactional
    public List<TaskResponseDto> assignTasksToSprint(UUID sprintId, AssignTaskToSprintRequestDto dto, UUID callerId) {
        Sprint sprint = getSprintOrThrow(sprintId);
        MemberPermissionsDto perms = requireMember(sprint.getProjectId(), callerId);
        requirePOOrSMOrAdmin(perms);

        if (sprint.getStatus() == SprintStatus.COMPLETED) {
            throw new ForbiddenException("Cannot add tasks to a completed sprint");
        }

        return dto.taskIds().stream()
                .map(taskId -> {
                    Task task = taskRepository.findById(taskId)
                            .orElseThrow(() -> new ResourceNotFoundException("Task not found: " + taskId));
                    if (!task.getProjectId().equals(sprint.getProjectId())) {
                        throw new ForbiddenException("Task does not belong to this project");
                    }
                    task.setSprintId(sprintId);
                    return TaskResponseDto.from(taskRepository.save(task));
                })
                .toList();
    }

    @Transactional
    public TaskResponseDto removeTaskFromSprint(UUID sprintId, UUID taskId, UUID callerId) {
        Sprint sprint = getSprintOrThrow(sprintId);
        MemberPermissionsDto perms = requireMember(sprint.getProjectId(), callerId);
        requirePOOrSMOrAdmin(perms);

        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));
        if (!sprintId.equals(task.getSprintId())) {
            throw new ResourceNotFoundException("Task is not in this sprint");
        }
        task.setSprintId(null);
        return TaskResponseDto.from(taskRepository.save(task));
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private Sprint getSprintOrThrow(UUID id) {
        return sprintRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Sprint not found"));
    }

    private MemberPermissionsDto requireMember(UUID projectId, UUID userId) {
        return projectServiceClient.getMemberPermissions(projectId, userId);
    }

    private void requireScrumMasterOrAdmin(MemberPermissionsDto p) {
        if ("ADMIN".equals(p.role())) return;
        if ("SCRUM_MASTER".equals(p.scrumRole())) return;
        throw new ForbiddenException("Scrum Master or Admin role required");
    }

    private void requirePOOrSMOrAdmin(MemberPermissionsDto p) {
        if ("ADMIN".equals(p.role())) return;
        if ("PRODUCT_OWNER".equals(p.scrumRole()) || "SCRUM_MASTER".equals(p.scrumRole())) return;
        throw new ForbiddenException("Product Owner, Scrum Master, or Admin role required");
    }
}