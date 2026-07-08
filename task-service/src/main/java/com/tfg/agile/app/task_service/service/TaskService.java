package com.tfg.agile.app.task_service.service;

import com.tfg.agile.app.task_service.client.MemberPermissionsDto;
import com.tfg.agile.app.task_service.client.ProjectServiceClient;
import com.tfg.agile.app.task_service.dto.*;
import com.tfg.agile.app.task_service.entity.Label;
import com.tfg.agile.app.task_service.entity.Task;
import com.tfg.agile.app.task_service.entity.TaskPriority;
import com.tfg.agile.app.task_service.exception.ForbiddenException;
import com.tfg.agile.app.task_service.exception.ResourceNotFoundException;
import com.tfg.agile.app.task_service.repository.LabelRepository;
import com.tfg.agile.app.task_service.repository.TaskRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.UUID;

@Service
public class TaskService {

    private final TaskRepository taskRepository;
    private final LabelRepository labelRepository;
    private final ProjectServiceClient projectServiceClient;
    private final BoardColumnService boardColumnService;

    public TaskService(TaskRepository taskRepository,
                       LabelRepository labelRepository,
                       ProjectServiceClient projectServiceClient,
                       BoardColumnService boardColumnService) {
        this.taskRepository = taskRepository;
        this.labelRepository = labelRepository;
        this.projectServiceClient = projectServiceClient;
        this.boardColumnService = boardColumnService;
    }

    @Transactional(readOnly = true)
    public List<TaskResponseDto> findMyTasks(UUID callerId) {
        return taskRepository.findByAssigneeId(callerId).stream()
                .map(TaskResponseDto::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TaskResponseDto> findByProject(UUID projectId, UUID callerId) {
        requireMember(projectId, callerId);
        return taskRepository.findByProjectIdOrderByStatusAscPositionAsc(projectId).stream()
                .map(TaskResponseDto::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public TaskResponseDto findById(UUID taskId, UUID callerId) {
        Task task = getTaskOrThrow(taskId);
        requireMember(task.getProjectId(), callerId);
        return TaskResponseDto.from(task);
    }

    @Transactional
    public TaskResponseDto create(UUID projectId, CreateTaskRequestDto dto, UUID callerId) {
        MemberPermissionsDto perms = requireMember(projectId, callerId);
        if (!isAdmin(perms) && !isProductOwner(perms)) {
            throw new ForbiddenException("ONLY_PO_OR_ADMIN_CAN_CREATE_TASKS");
        }

        TaskPriority priority = dto.priority() != null
                ? TaskPriority.valueOf(dto.priority().toUpperCase())
                : TaskPriority.MEDIUM;

        String firstColumn = boardColumnService.getFirstColumnName(projectId);
        int position = taskRepository.findByProjectIdAndStatusOrderByPositionAsc(projectId, firstColumn).size();

        Task task = Task.builder()
                .projectId(projectId)
                .title(dto.title())
                .description(dto.description())
                .status(firstColumn)
                .priority(priority)
                .reporterId(callerId)
                .assigneeId(dto.assigneeId())
                .position(position)
                .build();

        if (dto.labelIds() != null && !dto.labelIds().isEmpty()) {
            task.setLabels(new HashSet<>(labelRepository.findAllById(dto.labelIds())));
        }

        Task saved = taskRepository.save(task);
        projectServiceClient.touchProject(projectId);
        projectServiceClient.touchMemberActivity(projectId, callerId);
        return TaskResponseDto.from(saved);
    }

    @Transactional
    public TaskResponseDto update(UUID taskId, UpdateTaskRequestDto dto, UUID callerId) {
        Task task = getTaskOrThrow(taskId);
        MemberPermissionsDto perms = requireMember(task.getProjectId(), callerId);

        if (task.getSprintId() == null) {
            // Backlog task: owned by the PO
            if (!isAdmin(perms) && !isProductOwner(perms)) {
                throw new ForbiddenException("ONLY_PO_OR_ADMIN_CAN_EDIT_BACKLOG_TASKS");
            }
        } else {
            // Sprint task: owned by the Development Team
            if (!isAdmin(perms) && !isDeveloper(perms)) {
                throw new ForbiddenException("ONLY_DEVELOPERS_CAN_EDIT_SPRINT_TASKS");
            }
        }

        task.setTitle(dto.title());
        task.setDescription(dto.description());
        if (dto.priority() != null) {
            task.setPriority(TaskPriority.valueOf(dto.priority().toUpperCase()));
        }
        task.setAssigneeId(dto.assigneeId());

        if (dto.labelIds() != null) {
            task.setLabels(new HashSet<>(labelRepository.findAllById(dto.labelIds())));
        }

        Task saved = taskRepository.save(task);
        projectServiceClient.touchProject(task.getProjectId());
        projectServiceClient.touchMemberActivity(task.getProjectId(), callerId);
        return TaskResponseDto.from(saved);
    }

    @Transactional
    public TaskResponseDto move(UUID taskId, MoveTaskRequestDto dto, UUID callerId) {
        Task task = getTaskOrThrow(taskId);
        MemberPermissionsDto perms = requireMember(task.getProjectId(), callerId);

        // Moving tasks on the Kanban board is a Developer responsibility
        if (!isAdmin(perms) && !isDeveloper(perms)) {
            throw new ForbiddenException("ONLY_DEVELOPERS_CAN_MOVE_TASKS");
        }

        String newStatus = dto.status();
        task.setStatus(newStatus);
        task.setPosition(dto.position());

        // Manage completedAt automatically based on doneEquivalent columns
        boolean isDone = boardColumnService.isDoneEquivalent(task.getProjectId(), newStatus);
        if (isDone && task.getCompletedAt() == null) {
            task.setCompletedAt(Instant.now());
        } else if (!isDone) {
            task.setCompletedAt(null);
        }

        Task saved = taskRepository.save(task);
        projectServiceClient.touchProject(task.getProjectId());
        projectServiceClient.touchMemberActivity(task.getProjectId(), callerId);
        return TaskResponseDto.from(saved);
    }

    @Transactional
    public void delete(UUID taskId, UUID callerId) {
        Task task = getTaskOrThrow(taskId);
        MemberPermissionsDto perms = requireMember(task.getProjectId(), callerId);

        if (task.getSprintId() == null) {
            if (!isAdmin(perms) && !isProductOwner(perms)) {
                throw new ForbiddenException("ONLY_PO_OR_ADMIN_CAN_DELETE_BACKLOG_TASKS");
            }
        } else {
            if (!isAdmin(perms) && !isDeveloper(perms)) {
                throw new ForbiddenException("ONLY_DEVELOPERS_CAN_DELETE_SPRINT_TASKS");
            }
        }

        UUID projectId = task.getProjectId();
        taskRepository.delete(task);
        projectServiceClient.touchProject(projectId);
        projectServiceClient.touchMemberActivity(projectId, callerId);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private Task getTaskOrThrow(UUID id) {
        return taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("TASK_NOT_FOUND"));
    }

    private MemberPermissionsDto requireMember(UUID projectId, UUID userId) {
        return projectServiceClient.getMemberPermissions(projectId, userId);
    }

    private boolean isAdmin(MemberPermissionsDto p) {
        return p.workspaceAdmin() || p.teamAdmin();
    }

    private boolean isProductOwner(MemberPermissionsDto p) {
        return "PRODUCT_OWNER".equals(p.scrumRole());
    }

    private boolean isScrumMaster(MemberPermissionsDto p) {
        return "SCRUM_MASTER".equals(p.scrumRole());
    }

    private boolean isDeveloper(MemberPermissionsDto p) {
        return !isAdmin(p) && !isProductOwner(p) && !isScrumMaster(p);
    }

    @Transactional
    public void updateStoryPoints(UUID taskId, Integer storyPoints) {
        var task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("TASK_NOT_FOUND"));
        task.setStoryPoints(storyPoints);
        taskRepository.save(task);
    }
}