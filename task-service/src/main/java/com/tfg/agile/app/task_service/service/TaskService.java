package com.tfg.agile.app.task_service.service;

import com.tfg.agile.app.task_service.client.MemberPermissionsDto;
import com.tfg.agile.app.task_service.client.ProjectServiceClient;
import com.tfg.agile.app.task_service.dto.*;
import com.tfg.agile.app.task_service.entity.Task;
import com.tfg.agile.app.task_service.entity.TaskPriority;
import com.tfg.agile.app.task_service.entity.TaskStatus;
import com.tfg.agile.app.task_service.exception.ForbiddenException;
import com.tfg.agile.app.task_service.exception.ResourceNotFoundException;
import com.tfg.agile.app.task_service.repository.TaskRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class TaskService {

    private final TaskRepository taskRepository;
    private final ProjectServiceClient projectServiceClient;

    public TaskService(TaskRepository taskRepository, ProjectServiceClient projectServiceClient) {
        this.taskRepository = taskRepository;
        this.projectServiceClient = projectServiceClient;
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

        int position = taskRepository.findByProjectIdAndStatusOrderByPositionAsc(projectId, TaskStatus.TODO).size();

        Task task = Task.builder()
                .projectId(projectId)
                .title(dto.title())
                .description(dto.description())
                .priority(priority)
                .reporterId(callerId)
                .assigneeId(dto.assigneeId())
                .dueDate(dto.dueDate())
                .position(position)
                .build();

        return TaskResponseDto.from(taskRepository.save(task));
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
        task.setDueDate(dto.dueDate());

        return TaskResponseDto.from(taskRepository.save(task));
    }

    @Transactional
    public TaskResponseDto move(UUID taskId, MoveTaskRequestDto dto, UUID callerId) {
        Task task = getTaskOrThrow(taskId);
        MemberPermissionsDto perms = requireMember(task.getProjectId(), callerId);

        // Moving tasks on the Kanban board is a Developer responsibility
        if (!isAdmin(perms) && !isDeveloper(perms)) {
            throw new ForbiddenException("ONLY_DEVELOPERS_CAN_MOVE_TASKS");
        }

        TaskStatus newStatus = TaskStatus.valueOf(dto.status().toUpperCase());
        task.setStatus(newStatus);
        task.setPosition(dto.position());

        // Manage completedAt automatically
        if (newStatus == TaskStatus.DONE && task.getCompletedAt() == null) {
            task.setCompletedAt(Instant.now());
        } else if (newStatus != TaskStatus.DONE) {
            task.setCompletedAt(null);
        }

        return TaskResponseDto.from(taskRepository.save(task));
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

        taskRepository.delete(task);
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
        return "ADMIN".equals(p.role());
    }

    private boolean isViewer(MemberPermissionsDto p) {
        return "VIEWER".equals(p.role());
    }

    private boolean isProductOwner(MemberPermissionsDto p) {
        return "PRODUCT_OWNER".equals(p.scrumRole());
    }

    private boolean isScrumMaster(MemberPermissionsDto p) {
        return "SCRUM_MASTER".equals(p.scrumRole());
    }

    private boolean isDeveloper(MemberPermissionsDto p) {
        // Any non-ADMIN, non-VIEWER member without a PO or SM scrum role is a Developer
        return !isAdmin(p) && !isViewer(p) && !isProductOwner(p) && !isScrumMaster(p);
    }

    @Transactional
    public void updateStoryPoints(UUID taskId, Integer storyPoints) {
        var task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("TASK_NOT_FOUND"));
        task.setStoryPoints(storyPoints);
        taskRepository.save(task);
    }
}