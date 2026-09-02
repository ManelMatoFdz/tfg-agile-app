package com.tfg.agile.app.task_service.service;

import com.tfg.agile.app.task_service.client.MemberPermissionsDto;
import com.tfg.agile.app.task_service.client.ProjectServiceClient;
import com.tfg.agile.app.task_service.client.UserServiceClient;
import com.tfg.agile.app.task_service.dto.*;
import com.tfg.agile.app.task_service.dto.TaskResponseDto.SubtaskInfo;
import com.tfg.agile.app.task_service.entity.*;
import com.tfg.agile.app.task_service.exception.ConflictException;
import com.tfg.agile.app.task_service.exception.ForbiddenException;
import com.tfg.agile.app.task_service.exception.ResourceNotFoundException;
import com.tfg.agile.app.task_service.repository.EpicRepository;
import com.tfg.agile.app.task_service.repository.GitEventRepository;
import com.tfg.agile.app.task_service.repository.LabelRepository;
import com.tfg.agile.app.task_service.repository.TaskDependencyRepository;
import com.tfg.agile.app.task_service.repository.TaskRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class TaskService {

    private final TaskRepository taskRepository;
    private final LabelRepository labelRepository;
    private final EpicRepository epicRepository;
    private final TaskDependencyRepository dependencyRepository;
    private final GitEventRepository gitEventRepository;
    private final ProjectServiceClient projectServiceClient;
    private final UserServiceClient userServiceClient;
    private final BoardColumnService boardColumnService;
    private final ActivityService activityService;

    public TaskService(TaskRepository taskRepository,
                       LabelRepository labelRepository,
                       EpicRepository epicRepository,
                       TaskDependencyRepository dependencyRepository,
                       GitEventRepository gitEventRepository,
                       ProjectServiceClient projectServiceClient,
                       UserServiceClient userServiceClient,
                       BoardColumnService boardColumnService,
                       ActivityService activityService) {
        this.taskRepository = taskRepository;
        this.labelRepository = labelRepository;
        this.epicRepository = epicRepository;
        this.dependencyRepository = dependencyRepository;
        this.gitEventRepository = gitEventRepository;
        this.projectServiceClient = projectServiceClient;
        this.userServiceClient = userServiceClient;
        this.boardColumnService = boardColumnService;
        this.activityService = activityService;
    }

    @Transactional(readOnly = true)
    public List<TaskResponseDto> findMyTasks(UUID callerId) {
        return taskRepository.findByAssigneeId(callerId).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TaskResponseDto> findByProject(UUID projectId, UUID callerId) {
        requireMember(projectId, callerId);
        return taskRepository.findByProjectIdOrderByStatusAscPositionAsc(projectId).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public TaskResponseDto findById(UUID taskId, UUID callerId) {
        Task task = getTaskOrThrow(taskId);
        requireMember(task.getProjectId(), callerId);
        return toDto(task);
    }

    @Transactional(readOnly = true)
    public List<TaskResponseDto> getSubtasks(UUID taskId, UUID callerId) {
        Task parent = getTaskOrThrow(taskId);
        requireMember(parent.getProjectId(), callerId);
        return taskRepository.findByParentId(taskId).stream()
                .map(this::toDto)
                .toList();
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

        TaskType type = dto.type() != null
                ? TaskType.valueOf(dto.type().toUpperCase())
                : TaskType.TASK;

        UUID parentId = dto.parentId();
        UUID sprintId = null;

        // Subtask validation
        if (parentId != null) {
            Task parent = getTaskOrThrow(parentId);
            if (parent.getParentId() != null) {
                throw new ConflictException("MAX_ONE_LEVEL_DEPTH");
            }
            if (!parent.getProjectId().equals(projectId)) {
                throw new ConflictException("PARENT_WRONG_PROJECT");
            }
            if (parent.getType() != TaskType.STORY) {
                throw new ConflictException("ONLY_STORY_CAN_HAVE_CHILDREN");
            }
            // Subtasks are always TASK type
            type = TaskType.TASK;
            // Inherit sprint from parent
            sprintId = parent.getSprintId();
        }

        String firstColumn = boardColumnService.getFirstColumnName(projectId);
        int position = taskRepository.findByProjectIdAndStatusOrderByPositionAsc(projectId, firstColumn).size();

        Task task = Task.builder()
                .projectId(projectId)
                .title(dto.title())
                .description(dto.description())
                .status(firstColumn)
                .priority(priority)
                .type(type)
                .parentId(parentId)
                .reporterId(callerId)
                .assigneeId(dto.assigneeId())
                .sprintId(sprintId)
                .position(position)
                .definitionOfDone(parentId == null ? dto.definitionOfDone() : null)
                .build();

        // Subtasks cannot have story points
        if (parentId != null) {
            task.setStoryPoints(null);
        }

        if (dto.labelIds() != null && !dto.labelIds().isEmpty()) {
            task.setLabels(new HashSet<>(labelRepository.findAllById(dto.labelIds())));
        }

        Task saved = taskRepository.save(task);

        activityService.record(saved.getId(), callerId, TaskActivityType.CREATED, null, null);

        // Record on parent STORY that a subtask was added
        if (parentId != null) {
            activityService.record(parentId, callerId, TaskActivityType.SUBTASK_ADDED, null, saved.getTitle());
        }

        if (saved.getAssigneeId() != null && !saved.getAssigneeId().equals(callerId)) {
            notifyTaskAssigned(saved, perms.workspaceId(), callerId);
        }

        projectServiceClient.touchProject(projectId);
        projectServiceClient.touchMemberActivity(projectId, callerId);
        return toDto(saved);
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

        // Capture old values for activity log
        String oldTitle = task.getTitle();
        String oldDescription = task.getDescription();
        TaskPriority oldPriority = task.getPriority();
        UUID oldAssigneeId = task.getAssigneeId();
        boolean oldReady = task.isReady();
        Set<UUID> oldLabelIds = task.getLabels().stream().map(Label::getId).collect(Collectors.toSet());
        Map<UUID, String> oldLabelNames = task.getLabels().stream().collect(Collectors.toMap(Label::getId, Label::getName));

        task.setTitle(dto.title());
        task.setDescription(dto.description());
        if (dto.priority() != null) {
            task.setPriority(TaskPriority.valueOf(dto.priority().toUpperCase()));
        }

        task.setAssigneeId(dto.assigneeId());

        if (dto.labelIds() != null) {
            task.setLabels(new HashSet<>(labelRepository.findAllById(dto.labelIds())));
        }

        if (dto.ready() != null) {
            task.setReady(dto.ready());
        }

        if (task.getParentId() == null && dto.definitionOfDone() != null) {
            task.setDefinitionOfDone(dto.definitionOfDone());
        }

        Task saved = taskRepository.save(task);

        // Record activity for each changed field
        if (!oldTitle.equals(dto.title())) {
            activityService.record(saved.getId(), callerId, TaskActivityType.TITLE_CHANGED, oldTitle, dto.title());
        }
        String newDesc = dto.description() != null ? dto.description() : "";
        String oldDesc = oldDescription != null ? oldDescription : "";
        if (!oldDesc.equals(newDesc)) {
            activityService.record(saved.getId(), callerId, TaskActivityType.DESCRIPTION_CHANGED, null, null);
        }
        if (dto.priority() != null && oldPriority != saved.getPriority()) {
            activityService.record(saved.getId(), callerId, TaskActivityType.PRIORITY_CHANGED,
                    oldPriority.name(), saved.getPriority().name());
        }
        if (!Objects.equals(oldAssigneeId, saved.getAssigneeId())) {
            activityService.record(saved.getId(), callerId, TaskActivityType.ASSIGNEE_CHANGED,
                    oldAssigneeId != null ? oldAssigneeId.toString() : null,
                    saved.getAssigneeId() != null ? saved.getAssigneeId().toString() : null);
            if (saved.getAssigneeId() != null && !saved.getAssigneeId().equals(callerId)) {
                notifyTaskAssigned(saved, perms.workspaceId(), callerId);
            }
        }
        if (dto.labelIds() != null) {
            Set<UUID> newLabelIds = new HashSet<>(dto.labelIds());
            for (UUID added : newLabelIds) {
                if (!oldLabelIds.contains(added)) {
                    Label lbl = saved.getLabels().stream().filter(l -> l.getId().equals(added)).findFirst().orElse(null);
                    activityService.record(saved.getId(), callerId, TaskActivityType.LABEL_ADDED,
                            null, lbl != null ? lbl.getName() : added.toString());
                }
            }
            for (UUID removed : oldLabelIds) {
                if (!newLabelIds.contains(removed)) {
                    String removedName = oldLabelNames.getOrDefault(removed, removed.toString());
                    activityService.record(saved.getId(), callerId, TaskActivityType.LABEL_REMOVED,
                            removedName, null);
                }
            }
        }
        if (oldReady != saved.isReady()) {
            activityService.record(saved.getId(), callerId, TaskActivityType.READY_CHANGED,
                    String.valueOf(oldReady), String.valueOf(saved.isReady()));
        }

        projectServiceClient.touchProject(task.getProjectId());
        projectServiceClient.touchMemberActivity(task.getProjectId(), callerId);
        return toDto(saved);
    }

    @Transactional
    public TaskResponseDto move(UUID taskId, MoveTaskRequestDto dto, UUID callerId) {
        Task task = getTaskOrThrow(taskId);
        MemberPermissionsDto perms = requireMember(task.getProjectId(), callerId);

        // Moving tasks on the Kanban board is a Developer responsibility
        if (!isAdmin(perms) && !isDeveloper(perms)) {
            throw new ForbiddenException("ONLY_DEVELOPERS_CAN_MOVE_TASKS");
        }

        String oldStatus = task.getStatus();
        String newStatus = dto.status();

        if (task.getParentId() == null
                && task.getType() == TaskType.STORY
                && taskRepository.countByParentId(task.getId()) > 0) {
            throw new ForbiddenException("STORY_STATUS_IS_DERIVED");
        }

        // Enforce WIP limit on the target column
        if (!oldStatus.equals(newStatus)) {
            boardColumnService.checkWipLimit(task.getProjectId(), newStatus);
        }

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

        if (!oldStatus.equals(newStatus)) {
            activityService.record(saved.getId(), callerId, TaskActivityType.STATUS_CHANGED, oldStatus, newStatus);
            if (saved.getAssigneeId() != null && !saved.getAssigneeId().equals(callerId)) {
                notifyTaskStatusChanged(saved, oldStatus, newStatus, perms.workspaceId(), callerId);
            }

            // When a blocking task moves to DONE, notify assignees of unblocked tasks
            if (isDone) {
                notifyUnblockedTasks(saved, perms.workspaceId());
            }
        }

        syncParentStoryStatus(saved, callerId);

        projectServiceClient.touchProject(task.getProjectId());
        projectServiceClient.touchMemberActivity(task.getProjectId(), callerId);
        return toDto(saved);
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
        UUID parentId = task.getParentId();
        String taskTitle = task.getTitle();

        // Remove all dependencies involving this task
        List<TaskDependency> deps = dependencyRepository
                .findByBlockingTaskIdOrBlockedTaskId(taskId, taskId);
        if (!deps.isEmpty()) {
            dependencyRepository.deleteAll(deps);
        }

        gitEventRepository.deleteByTaskId(taskId);

        // If STORY, delete all children first
        if (task.getType() == TaskType.STORY) {
            List<Task> children = taskRepository.findByParentId(taskId);
            for (Task child : children) {
                List<TaskDependency> childDeps = dependencyRepository
                        .findByBlockingTaskIdOrBlockedTaskId(child.getId(), child.getId());
                if (!childDeps.isEmpty()) dependencyRepository.deleteAll(childDeps);
                gitEventRepository.deleteByTaskId(child.getId());
            }
            taskRepository.deleteAll(children);
        }

        taskRepository.delete(task);

        // If deleting a subtask, record on parent
        if (parentId != null) {
            activityService.record(parentId, callerId, TaskActivityType.SUBTASK_REMOVED, taskTitle, null);
        }

        projectServiceClient.touchProject(projectId);
        projectServiceClient.touchMemberActivity(projectId, callerId);
    }

    // ── Toggle subtask done ─────────────────────────────────────────────────

    @Transactional
    public TaskResponseDto toggleSubtaskDone(UUID taskId, UUID callerId) {
        Task task = getTaskOrThrow(taskId);
        if (task.getParentId() == null) {
            throw new ConflictException("NOT_A_SUBTASK");
        }
        requireMember(task.getProjectId(), callerId);

        Set<String> doneStatuses = boardColumnService.getDoneEquivalentStatuses(task.getProjectId());
        boolean isDone = doneStatuses.contains(task.getStatus());

        String oldStatus = task.getStatus();
        String newStatus;
        if (isDone) {
            newStatus = boardColumnService.getFirstColumnName(task.getProjectId());
            task.setCompletedAt(null);
        } else {
            newStatus = doneStatuses.iterator().next();
            task.setCompletedAt(Instant.now());
        }

        task.setStatus(newStatus);
        Task saved = taskRepository.save(task);

        if (!oldStatus.equals(newStatus)) {
            activityService.record(saved.getId(), callerId, TaskActivityType.STATUS_CHANGED, oldStatus, newStatus);
        }

        syncParentStoryStatus(saved, callerId);

        return toDto(saved);
    }

    // ── DTO conversion ───────────────────────────────────────────────────────

    TaskResponseDto toDto(Task t) {
        int subtaskCount = 0;
        int completedSubtaskCount = 0;
        String parentTitle = null;
        Set<String> doneStatuses = boardColumnService.getDoneEquivalentStatuses(t.getProjectId());

        if (t.getParentId() == null) {
            subtaskCount = taskRepository.countByParentId(t.getId());
            if (subtaskCount > 0) {
                completedSubtaskCount = taskRepository.countByParentIdAndStatusIn(t.getId(), doneStatuses);
            }
        }
        if (t.getParentId() != null) {
            parentTitle = taskRepository.findById(t.getParentId())
                    .map(Task::getTitle)
                    .orElse(null);
        }

        TaskResponseDto.EpicInfo epicInfo = TaskResponseDto.EpicInfo.EMPTY;
        if (t.getEpicId() != null) {
            epicInfo = epicRepository.findById(t.getEpicId())
                    .map(e -> new TaskResponseDto.EpicInfo(e.getName(), e.getColor()))
                    .orElse(TaskResponseDto.EpicInfo.EMPTY);
        }

        int blockedByCount = doneStatuses.isEmpty()
                ? dependencyRepository.countByBlockedTaskId(t.getId())
                : dependencyRepository.countActiveBlockers(t.getId(), doneStatuses);
        int blocksCount = dependencyRepository.countByBlockingTaskId(t.getId());
        TaskResponseDto.DependencyInfo depInfo = new TaskResponseDto.DependencyInfo(blockedByCount, blocksCount);

        int gitEventCount = gitEventRepository.countByTaskId(t.getId());

        return TaskResponseDto.from(t, new SubtaskInfo(subtaskCount, completedSubtaskCount, parentTitle), epicInfo,
                depInfo, gitEventCount);
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

    private void syncParentStoryStatus(Task subtask, UUID callerId) {
        UUID parentId = subtask.getParentId();
        if (parentId == null) {
            return;
        }

        Task parent = taskRepository.findById(parentId).orElse(null);
        if (parent == null || parent.getType() != TaskType.STORY) {
            return;
        }

        List<Task> children = taskRepository.findByParentId(parentId);
        if (children.isEmpty()) {
            return;
        }

        Set<String> doneStatuses = boardColumnService.getDoneEquivalentStatuses(parent.getProjectId());
        boolean allDone = children.stream().allMatch(child -> doneStatuses.contains(child.getStatus()));
        boolean parentIsDone = doneStatuses.contains(parent.getStatus());

        String oldStatus = parent.getStatus();
        if (allDone && !parentIsDone) {
            String doneStatus = doneStatuses.contains(subtask.getStatus())
                    ? subtask.getStatus()
                    : doneStatuses.iterator().next();
            parent.setStatus(doneStatus);
            parent.setCompletedAt(Instant.now());
        } else if (!allDone && parentIsDone) {
            parent.setStatus(boardColumnService.getFirstColumnName(parent.getProjectId()));
            parent.setCompletedAt(null);
        } else {
            return;
        }

        Task savedParent = taskRepository.save(parent);
        activityService.record(savedParent.getId(), callerId, TaskActivityType.STATUS_CHANGED, oldStatus, savedParent.getStatus());
    }

    private void notifyTaskAssigned(Task task, UUID workspaceId, UUID actorUserId) {
        String link = "/workspaces/" + workspaceId + "/projects/" + task.getProjectId() + "/board";
        userServiceClient.sendNotification(
                task.getAssigneeId(),
                "Tarea asignada",
                "Te han asignado la tarea «" + task.getTitle() + "»",
                "TASK_REMINDER",
                link,
                null,
                actorUserId
        );
    }

    private void notifyUnblockedTasks(Task completedTask, UUID workspaceId) {
        List<TaskDependency> blocking = dependencyRepository.findByBlockingTaskId(completedTask.getId());
        if (blocking.isEmpty()) return;

        Set<String> doneStatuses = boardColumnService.getDoneEquivalentStatuses(completedTask.getProjectId());

        for (TaskDependency dep : blocking) {
            Task blockedTask = taskRepository.findById(dep.getBlockedTaskId()).orElse(null);
            if (blockedTask == null || blockedTask.getAssigneeId() == null) continue;

            // Check if all blockers of this task are now done
            List<TaskDependency> allBlockers = dependencyRepository.findByBlockedTaskId(blockedTask.getId());
            boolean allDone = allBlockers.stream().allMatch(d -> {
                Task blocker = taskRepository.findById(d.getBlockingTaskId()).orElse(null);
                return blocker != null && doneStatuses.contains(blocker.getStatus());
            });

            if (allDone) {
                String link = "/workspaces/" + workspaceId + "/projects/" + blockedTask.getProjectId() + "/board";
                userServiceClient.sendNotification(
                        blockedTask.getAssigneeId(),
                        "Tarea desbloqueada",
                        "La tarea «" + blockedTask.getTitle() + "» ya no está bloqueada",
                        "TASK_REMINDER",
                        link,
                        null
                );
            }
        }
    }

    private void notifyTaskStatusChanged(Task task, String oldStatus, String newStatus, UUID workspaceId, UUID actorUserId) {
        String link = "/workspaces/" + workspaceId + "/projects/" + task.getProjectId() + "/board";
        userServiceClient.sendNotification(
                task.getAssigneeId(),
                "Tarea actualizada",
                "La tarea «" + task.getTitle() + "» pasó de " + oldStatus + " a " + newStatus,
                "TASK_REMINDER",
                link,
                null,
                actorUserId
        );
    }

    @Transactional
    public void updateStoryPoints(UUID taskId, Integer storyPoints) {
        var task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("TASK_NOT_FOUND"));
        // Subtasks cannot have story points
        if (task.getParentId() != null) {
            throw new ConflictException("SUBTASKS_CANNOT_HAVE_STORY_POINTS");
        }
        Integer oldPoints = task.getStoryPoints();
        task.setStoryPoints(storyPoints);
        taskRepository.save(task);

        activityService.record(taskId, null, TaskActivityType.STORY_POINTS_CHANGED,
                oldPoints != null ? oldPoints.toString() : null,
                storyPoints != null ? storyPoints.toString() : null);
    }
}
