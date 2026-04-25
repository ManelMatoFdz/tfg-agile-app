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
        if (isViewer(perms)) {
            throw new ForbiddenException("Viewers cannot create tasks");
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
                .storyPoints(dto.storyPoints())
                .position(position)
                .build();

        return TaskResponseDto.from(taskRepository.save(task));
    }

    @Transactional
    public TaskResponseDto update(UUID taskId, UpdateTaskRequestDto dto, UUID callerId) {
        Task task = getTaskOrThrow(taskId);
        MemberPermissionsDto perms = requireMember(task.getProjectId(), callerId);

        if (isViewer(perms)) {
            throw new ForbiddenException("Viewers cannot edit tasks");
        }
        if (!task.getReporterId().equals(callerId) && !canEditAnyTask(perms)) {
            throw new ForbiddenException("You can only edit your own tasks");
        }

        task.setTitle(dto.title());
        task.setDescription(dto.description());
        if (dto.priority() != null) {
            task.setPriority(TaskPriority.valueOf(dto.priority().toUpperCase()));
        }
        task.setAssigneeId(dto.assigneeId());
        task.setStoryPoints(dto.storyPoints());

        return TaskResponseDto.from(taskRepository.save(task));
    }

    @Transactional
    public TaskResponseDto move(UUID taskId, MoveTaskRequestDto dto, UUID callerId) {
        Task task = getTaskOrThrow(taskId);
        MemberPermissionsDto perms = requireMember(task.getProjectId(), callerId);

        if (isViewer(perms)) {
            throw new ForbiddenException("Viewers cannot move tasks");
        }

        task.setStatus(TaskStatus.valueOf(dto.status().toUpperCase()));
        task.setPosition(dto.position());

        return TaskResponseDto.from(taskRepository.save(task));
    }

    @Transactional
    public void delete(UUID taskId, UUID callerId) {
        Task task = getTaskOrThrow(taskId);
        MemberPermissionsDto perms = requireMember(task.getProjectId(), callerId);

        if (!isAdmin(perms)) {
            throw new ForbiddenException("Only project admins can delete tasks");
        }

        taskRepository.delete(task);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private Task getTaskOrThrow(UUID id) {
        return taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));
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

    private boolean canEditAnyTask(MemberPermissionsDto p) {
        return isAdmin(p)
                || "PRODUCT_OWNER".equals(p.scrumRole())
                || "SCRUM_MASTER".equals(p.scrumRole());
    }
}