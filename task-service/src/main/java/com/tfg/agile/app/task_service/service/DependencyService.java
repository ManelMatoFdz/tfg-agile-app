package com.tfg.agile.app.task_service.service;

import com.tfg.agile.app.task_service.client.MemberPermissionsDto;
import com.tfg.agile.app.task_service.client.ProjectServiceClient;
import com.tfg.agile.app.task_service.client.UserServiceClient;
import com.tfg.agile.app.task_service.dto.CreateDependencyRequestDto;
import com.tfg.agile.app.task_service.dto.TaskDependencyDto;
import com.tfg.agile.app.task_service.entity.Task;
import com.tfg.agile.app.task_service.entity.TaskActivityType;
import com.tfg.agile.app.task_service.entity.TaskDependency;
import com.tfg.agile.app.task_service.exception.ConflictException;
import com.tfg.agile.app.task_service.exception.ForbiddenException;
import com.tfg.agile.app.task_service.exception.ResourceNotFoundException;
import com.tfg.agile.app.task_service.repository.TaskDependencyRepository;
import com.tfg.agile.app.task_service.repository.TaskRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class DependencyService {

    private final TaskDependencyRepository dependencyRepository;
    private final TaskRepository taskRepository;
    private final ProjectServiceClient projectServiceClient;
    private final ActivityService activityService;

    public DependencyService(TaskDependencyRepository dependencyRepository,
                             TaskRepository taskRepository,
                             ProjectServiceClient projectServiceClient,
                             ActivityService activityService) {
        this.dependencyRepository = dependencyRepository;
        this.taskRepository = taskRepository;
        this.projectServiceClient = projectServiceClient;
        this.activityService = activityService;
    }

    @Transactional(readOnly = true)
    public List<TaskDependencyDto> findByTask(UUID taskId, UUID callerId) {
        Task task = getTaskOrThrow(taskId);
        projectServiceClient.getMemberPermissions(task.getProjectId(), callerId);

        List<TaskDependency> deps = dependencyRepository
                .findByBlockingTaskIdOrBlockedTaskId(taskId, taskId);
        return enrichDeps(deps);
    }

    @Transactional(readOnly = true)
    public List<TaskDependencyDto> findByProject(UUID projectId, UUID callerId) {
        projectServiceClient.getMemberPermissions(projectId, callerId);

        List<UUID> taskIds = taskRepository.findByProjectIdOrderByStatusAscPositionAsc(projectId)
                .stream().map(Task::getId).toList();
        if (taskIds.isEmpty()) return List.of();

        List<TaskDependency> deps = dependencyRepository
                .findByBlockingTaskIdInOrBlockedTaskIdIn(taskIds, taskIds);
        return enrichDeps(deps);
    }

    @Transactional
    public TaskDependencyDto create(UUID blockingTaskId, CreateDependencyRequestDto dto, UUID callerId) {
        Task blockingTask = getTaskOrThrow(blockingTaskId);
        Task blockedTask = getTaskOrThrow(dto.blockedTaskId());

        // Both tasks must belong to the same project
        if (!blockingTask.getProjectId().equals(blockedTask.getProjectId())) {
            throw new ConflictException("DEPENDENCY_DIFFERENT_PROJECTS");
        }

        // Check permissions — same as editing the task
        MemberPermissionsDto perms = projectServiceClient.getMemberPermissions(
                blockingTask.getProjectId(), callerId);
        requireCanEditTask(blockingTask, perms);

        // Cannot depend on itself
        if (blockingTaskId.equals(dto.blockedTaskId())) {
            throw new ConflictException("DEPENDENCY_SELF_REFERENCE");
        }

        // Check for duplicate
        List<TaskDependency> existing = dependencyRepository.findByBlockingTaskIdOrBlockedTaskId(
                blockingTaskId, blockingTaskId);
        boolean duplicate = existing.stream().anyMatch(d ->
                d.getBlockingTaskId().equals(blockingTaskId)
                        && d.getBlockedTaskId().equals(dto.blockedTaskId()));
        if (duplicate) {
            throw new ConflictException("DEPENDENCY_ALREADY_EXISTS");
        }

        // Cycle detection: from blockedTask, can we reach blockingTask via "blocks" edges?
        if (wouldCreateCycle(blockingTaskId, dto.blockedTaskId())) {
            throw new ConflictException("DEPENDENCY_CYCLE_DETECTED");
        }

        TaskDependency dep = TaskDependency.builder()
                .blockingTaskId(blockingTaskId)
                .blockedTaskId(dto.blockedTaskId())
                .createdBy(callerId)
                .build();

        TaskDependency saved = dependencyRepository.save(dep);

        // Record activity on both tasks
        activityService.record(blockingTaskId, callerId, TaskActivityType.DEPENDENCY_ADDED,
                null, blockedTask.getTitle());
        activityService.record(dto.blockedTaskId(), callerId, TaskActivityType.DEPENDENCY_ADDED,
                blockingTask.getTitle(), null);

        projectServiceClient.touchProject(blockingTask.getProjectId());

        return TaskDependencyDto.from(saved,
                blockingTask.getTitle(), blockingTask.getStatus(),
                blockedTask.getTitle(), blockedTask.getStatus());
    }

    @Transactional
    public void delete(UUID taskId, UUID dependencyId, UUID callerId) {
        Task task = getTaskOrThrow(taskId);
        MemberPermissionsDto perms = projectServiceClient.getMemberPermissions(
                task.getProjectId(), callerId);
        requireCanEditTask(task, perms);

        TaskDependency dep = dependencyRepository.findById(dependencyId)
                .orElseThrow(() -> new ResourceNotFoundException("DEPENDENCY_NOT_FOUND"));

        // Ensure the dependency belongs to this task
        if (!dep.getBlockingTaskId().equals(taskId) && !dep.getBlockedTaskId().equals(taskId)) {
            throw new ResourceNotFoundException("DEPENDENCY_NOT_FOUND");
        }

        Task blockingTask = taskRepository.findById(dep.getBlockingTaskId()).orElse(null);
        Task blockedTask = taskRepository.findById(dep.getBlockedTaskId()).orElse(null);

        dependencyRepository.delete(dep);

        // Record activity
        if (blockingTask != null) {
            activityService.record(dep.getBlockingTaskId(), callerId, TaskActivityType.DEPENDENCY_REMOVED,
                    blockedTask != null ? blockedTask.getTitle() : null, null);
        }
        if (blockedTask != null) {
            activityService.record(dep.getBlockedTaskId(), callerId, TaskActivityType.DEPENDENCY_REMOVED,
                    null, blockingTask != null ? blockingTask.getTitle() : null);
        }

        projectServiceClient.touchProject(task.getProjectId());
    }

    // ── Cycle detection (BFS) ─────────────────────────────────────────────────

    /**
     * Check if adding edge blockingTaskId → blockedTaskId would create a cycle.
     * A cycle exists if we can reach blockingTaskId starting from blockedTaskId
     * by following existing "blocks" edges (blockedTaskId blocks X, X blocks Y, ...).
     */
    private boolean wouldCreateCycle(UUID blockingTaskId, UUID blockedTaskId) {
        Set<UUID> visited = new HashSet<>();
        Queue<UUID> queue = new LinkedList<>();
        queue.add(blockedTaskId);

        while (!queue.isEmpty()) {
            UUID current = queue.poll();
            if (current.equals(blockingTaskId)) {
                return true; // cycle detected
            }
            if (!visited.add(current)) {
                continue;
            }
            // Follow edges: current blocks → others (current is blockingTaskId in existing deps)
            List<TaskDependency> outgoing = dependencyRepository.findByBlockingTaskId(current);
            for (TaskDependency dep : outgoing) {
                queue.add(dep.getBlockedTaskId());
            }
        }
        return false;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Task getTaskOrThrow(UUID id) {
        return taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("TASK_NOT_FOUND"));
    }

    private void requireCanEditTask(Task task, MemberPermissionsDto perms) {
        boolean isAdmin = perms.workspaceAdmin() || perms.teamAdmin();
        if (isAdmin) return;

        boolean isPo = "PRODUCT_OWNER".equals(perms.scrumRole());
        boolean isDev = !isPo && !"SCRUM_MASTER".equals(perms.scrumRole());

        if (task.getSprintId() == null) {
            // Backlog task — PO or Admin
            if (!isPo) throw new ForbiddenException("ONLY_PO_OR_ADMIN_CAN_EDIT_BACKLOG_TASKS");
        } else {
            // Sprint task — Developer or Admin
            if (!isDev) throw new ForbiddenException("ONLY_DEVELOPERS_CAN_EDIT_SPRINT_TASKS");
        }
    }

    private List<TaskDependencyDto> enrichDeps(List<TaskDependency> deps) {
        if (deps.isEmpty()) return List.of();

        Set<UUID> taskIds = new HashSet<>();
        for (TaskDependency d : deps) {
            taskIds.add(d.getBlockingTaskId());
            taskIds.add(d.getBlockedTaskId());
        }

        Map<UUID, Task> taskMap = taskRepository.findAllById(taskIds).stream()
                .collect(Collectors.toMap(Task::getId, t -> t));

        return deps.stream().map(d -> {
            Task blocking = taskMap.get(d.getBlockingTaskId());
            Task blocked = taskMap.get(d.getBlockedTaskId());
            return TaskDependencyDto.from(d,
                    blocking != null ? blocking.getTitle() : null,
                    blocking != null ? blocking.getStatus() : null,
                    blocked != null ? blocked.getTitle() : null,
                    blocked != null ? blocked.getStatus() : null);
        }).toList();
    }
}
