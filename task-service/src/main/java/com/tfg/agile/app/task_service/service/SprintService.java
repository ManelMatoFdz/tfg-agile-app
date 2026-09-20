package com.tfg.agile.app.task_service.service;

import com.tfg.agile.app.task_service.client.MemberPermissionsDto;
import com.tfg.agile.app.task_service.client.ProjectServiceClient;
import com.tfg.agile.app.task_service.dto.*;
import com.tfg.agile.app.task_service.entity.*;
import com.tfg.agile.app.task_service.exception.ConflictException;
import com.tfg.agile.app.task_service.exception.ForbiddenException;
import com.tfg.agile.app.task_service.exception.ResourceNotFoundException;
import com.tfg.agile.app.task_service.repository.SprintRepository;
import com.tfg.agile.app.task_service.repository.SprintTaskSnapshotRepository;
import com.tfg.agile.app.task_service.repository.TaskRepository;
import com.tfg.agile.app.task_service.repository.TaskSpecifications;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class SprintService {

    private final SprintRepository sprintRepository;
    private final TaskRepository taskRepository;
    private final SprintTaskSnapshotRepository snapshotRepository;
    private final ProjectServiceClient projectServiceClient;
    private final BoardColumnService boardColumnService;
    private final TaskService taskService;
    private final ActivityService activityService;
    private final TaskNotificationService taskNotificationService;

    public SprintService(SprintRepository sprintRepository,
                         TaskRepository taskRepository,
                         SprintTaskSnapshotRepository snapshotRepository,
                         ProjectServiceClient projectServiceClient,
                         BoardColumnService boardColumnService,
                         TaskService taskService,
                         ActivityService activityService,
                         TaskNotificationService taskNotificationService) {
        this.sprintRepository = sprintRepository;
        this.taskRepository = taskRepository;
        this.snapshotRepository = snapshotRepository;
        this.projectServiceClient = projectServiceClient;
        this.boardColumnService = boardColumnService;
        this.taskService = taskService;
        this.activityService = activityService;
        this.taskNotificationService = taskNotificationService;
    }

    // ── Backlog ───────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<TaskResponseDto> getBacklog(UUID projectId,
                                            List<String> priorities,
                                            List<UUID> assigneeIds,
                                            List<UUID> labelIds,
                                            List<String> statuses,
                                            List<Boolean> ready,
                                            List<UUID> epicIds,
                                            String search,
                                            UUID callerId) {
        requireMember(projectId, callerId);

        Specification<Task> spec = Specification.where(TaskSpecifications.hasProjectId(projectId))
                .and(TaskSpecifications.inBacklog())
                .and(TaskSpecifications.isRootTask());
        spec = applyFilters(spec, priorities, assigneeIds, labelIds, statuses, epicIds, search);
        spec = applyReadyFilter(spec, ready);

        return taskRepository.findAll(spec, Sort.by(Sort.Order.desc("priority"), Sort.Order.asc("position")))
                .stream()
                .map(taskService::toDto)
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
    public VelocityDto getVelocity(UUID projectId, UUID callerId) {
        requireMember(projectId, callerId);
        long count = sprintRepository.countCompleted(projectId);
        double avg = count > 0 ? sprintRepository.averageVelocity(projectId) : 0;
        return new VelocityDto(Math.round(avg * 10.0) / 10.0, count);
    }

    @Transactional(readOnly = true)
    public List<TaskResponseDto> getSprintTasks(UUID sprintId,
                                                List<String> priorities,
                                                List<UUID> assigneeIds,
                                                List<UUID> labelIds,
                                                String search,
                                                UUID callerId) {
        Sprint sprint = getSprintOrThrow(sprintId);
        requireMember(sprint.getProjectId(), callerId);

        Specification<Task> spec = Specification.where(TaskSpecifications.hasSprintId(sprintId))
                .and(TaskSpecifications.isRootTask());
        spec = applyFilters(spec, priorities, assigneeIds, labelIds, null, null, search);

        return taskRepository.findAll(spec, Sort.by(Sort.Order.asc("status"), Sort.Order.asc("position")))
                .stream()
                .map(taskService::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TaskResponseDto> getSprintAllTasks(UUID sprintId,
                                                    List<String> priorities,
                                                    List<UUID> assigneeIds,
                                                    List<UUID> labelIds,
                                                    List<String> statuses,
                                                    String search,
                                                    UUID callerId) {
        Sprint sprint = getSprintOrThrow(sprintId);
        requireMember(sprint.getProjectId(), callerId);

        Specification<Task> spec = Specification.where(TaskSpecifications.hasSprintId(sprintId))
                .and(TaskSpecifications.isRootTask());
        spec = applyFilters(spec, priorities, assigneeIds, labelIds, statuses, null, search);

        return taskRepository.findAll(spec, Sort.by(Sort.Order.desc("priority"), Sort.Order.asc("position")))
                .stream()
                .map(taskService::toDto)
                .toList();
    }

    @Transactional
    public SprintResponseDto createSprint(UUID projectId, CreateSprintRequestDto dto, UUID callerId) {
        MemberPermissionsDto perms = requireMember(projectId, callerId);
        requireScrumMaster(perms);

        validateDateRange(dto.startDate(), dto.endDate());
        validateNoOverlap(projectId, UUID.randomUUID(), dto.startDate(), dto.endDate());

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
        requireScrumMaster(perms);

        if (sprint.getStatus() == SprintStatus.COMPLETED) {
            throw new ForbiddenException("CANNOT_EDIT_COMPLETED_SPRINT");
        }

        sprint.setName(dto.name());
        sprint.setGoal(dto.goal());

        if (sprint.getStatus() == SprintStatus.PLANNING) {
            validateDateRange(dto.startDate(), dto.endDate());
            validateNoOverlap(sprint.getProjectId(), sprint.getId(), dto.startDate(), dto.endDate());
            sprint.setStartDate(dto.startDate());
            sprint.setEndDate(dto.endDate());
        }
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
        requireScrumMaster(perms);

        if (sprint.getStatus() != SprintStatus.PLANNING) {
            throw new ConflictException("SPRINT_NOT_PLANNING");
        }
        if (sprint.getStartDate() == null) {
            throw new IllegalArgumentException("SPRINT_START_DATE_REQUIRED");
        }
        LocalDate today = LocalDate.now();
        if (sprint.getEndDate() == null) {
            throw new IllegalArgumentException("SPRINT_END_DATE_REQUIRED");
        }
        if (sprint.getEndDate().isBefore(today)) {
            throw new IllegalArgumentException("SPRINT_END_DATE_IN_PAST");
        }
        if (sprintRepository.existsByProjectIdAndStatus(sprint.getProjectId(), SprintStatus.ACTIVE)) {
            throw new ConflictException("SPRINT_ALREADY_ACTIVE");
        }
        Sprint nextSprint = getNextPlanningSprintToStart(sprint.getProjectId(), today);
        if (!sprint.getId().equals(nextSprint.getId())) {
            throw new ConflictException("SPRINT_NOT_NEXT_TO_START");
        }

        sprint.setStartDate(today);
        sprint.setStatus(SprintStatus.ACTIVE);
        SprintResponseDto result = SprintResponseDto.from(sprintRepository.save(sprint));
        projectServiceClient.touchProject(sprint.getProjectId());
        projectServiceClient.touchMemberActivity(sprint.getProjectId(), callerId);
        taskNotificationService.notifySprintStarted(sprint, callerId);
        return result;
    }

    /**
     * Internal method to activate a sprint. Used by the scheduler for auto-start.
     * Only activates if no other sprint is already active for the same project.
     */
    @Transactional
    public boolean activateSprintInternal(Sprint sprint) {
        if (sprintRepository.existsByProjectIdAndStatus(sprint.getProjectId(), SprintStatus.ACTIVE)) {
            return false;
        }
        sprint.setStatus(SprintStatus.ACTIVE);
        sprintRepository.save(sprint);
        projectServiceClient.touchProject(sprint.getProjectId());
        taskNotificationService.notifySprintStarted(sprint, null);
        return true;
    }

    /**
     * Internal method that performs the actual sprint completion logic.
     * Used by the scheduler for automatic closure at endDate.
     */
    @Transactional
    public void completeSprintInternal(Sprint sprint) {
        completeSprintInternal(sprint, null);
    }

    private void completeSprintInternal(Sprint sprint, UUID actorUserId) {
        UUID sprintId = sprint.getId();
        UUID projectId = sprint.getProjectId();
        List<Task> allSprintTasks = taskRepository.findBySprintIdOrderByStatusAscPositionAsc(sprintId);

        Set<String> doneStatuses = boardColumnService.getDoneEquivalentStatuses(projectId);
        String firstColumn = boardColumnService.getFirstColumnName(projectId);

        // Metrics count only root tasks (PBIs) — subtasks are implementation details
        List<Task> rootTasks = allSprintTasks.stream().filter(t -> t.getParentId() == null).toList();
        int closedTotal = rootTasks.size();
        int closedDone = (int) rootTasks.stream().filter(t -> doneStatuses.contains(t.getStatus())).count();
        int closedTotalSP = rootTasks.stream().mapToInt(t -> t.getStoryPoints() != null ? t.getStoryPoints() : 0).sum();
        int closedDoneSP = rootTasks.stream().filter(t -> doneStatuses.contains(t.getStatus())).mapToInt(t -> t.getStoryPoints() != null ? t.getStoryPoints() : 0).sum();

        sprint.setClosedTotalTasks(closedTotal);
        sprint.setClosedDoneTasks(closedDone);
        sprint.setClosedIncompleteTasks(closedTotal - closedDone);
        sprint.setClosedTotalStoryPoints(closedTotalSP);
        sprint.setClosedDoneStoryPoints(closedDoneSP);

        List<SprintTaskSnapshot> snapshots = allSprintTasks.stream()
                .map(t -> {
                    boolean isDone = doneStatuses.contains(t.getStatus());
                    return SprintTaskSnapshot.builder()
                        .sprintId(sprintId)
                        .taskId(t.getId())
                        .title(t.getTitle())
                        .description(t.getDescription())
                        .statusAtEnd(t.getStatus())
                        .priority(t.getPriority())
                        .type(t.getType())
                        .parentTaskId(t.getParentId())
                        .completedAt(t.getCompletedAt())
                        .storyPoints(t.getStoryPoints())
                        .completed(isDone)
                        .returnedToBacklog(!isDone)
                        .build();
                })
                .toList();
        snapshotRepository.saveAll(snapshots);

        allSprintTasks.stream()
                .filter(t -> !doneStatuses.contains(t.getStatus()))
                .forEach(t -> {
                    String oldStatus = t.getStatus();
                    t.setSprintId(null);
                    t.setStatus(firstColumn);
                    taskRepository.save(t);
                    activityService.record(t.getId(), null, TaskActivityType.RETURNED_TO_BACKLOG,
                            sprint.getName(), null);
                    if (!oldStatus.equals(firstColumn)) {
                        activityService.record(t.getId(), null, TaskActivityType.STATUS_CHANGED,
                                oldStatus, firstColumn);
                    }
                });

        sprint.setEndDate(LocalDate.now());
        sprint.setStatus(SprintStatus.COMPLETED);
        sprintRepository.save(sprint);
        projectServiceClient.touchProject(projectId);
        taskNotificationService.notifySprintCompleted(sprint, actorUserId);
    }

    @Transactional
    public SprintResponseDto completeSprint(UUID sprintId, UUID callerId) {
        Sprint sprint = getSprintOrThrow(sprintId);
        MemberPermissionsDto perms = requireMember(sprint.getProjectId(), callerId);
        requireScrumMaster(perms);

        if (sprint.getStatus() != SprintStatus.ACTIVE) {
            throw new ConflictException("SPRINT_NOT_ACTIVE");
        }

        completeSprintInternal(sprint, callerId);
        projectServiceClient.touchMemberActivity(sprint.getProjectId(), callerId);
        return SprintResponseDto.from(sprint);
    }

    @Transactional
    public SprintResponseDto saveRetrospective(UUID sprintId, String reviewNotes, UUID callerId) {
        Sprint sprint = getSprintOrThrow(sprintId);
        MemberPermissionsDto perms = requireMember(sprint.getProjectId(), callerId);
        requireScrumMaster(perms);

        if (sprint.getStatus() != SprintStatus.COMPLETED) {
            throw new ConflictException("SPRINT_NOT_COMPLETED");
        }

        sprint.setReviewNotes(reviewNotes);
        SprintResponseDto result = SprintResponseDto.from(sprintRepository.save(sprint));
        projectServiceClient.touchProject(sprint.getProjectId());
        projectServiceClient.touchMemberActivity(sprint.getProjectId(), callerId);
        return result;
    }

    @Transactional
    public void deleteSprint(UUID sprintId, UUID callerId) {
        Sprint sprint = getSprintOrThrow(sprintId);
        MemberPermissionsDto perms = requireMember(sprint.getProjectId(), callerId);
        requireScrumMaster(perms);

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

        if (sprint.getStatus() == SprintStatus.PLANNING || sprint.getStatus() == SprintStatus.ACTIVE) {
            requireDeveloper(perms);
        } else {
            throw new ForbiddenException("CAN_ONLY_ADD_TASKS_TO_PLANNING_OR_ACTIVE_SPRINT");
        }

        Set<String> doneStatuses = boardColumnService.getDoneEquivalentStatuses(sprint.getProjectId());

        List<TaskResponseDto> result = dto.taskIds().stream()
                .map(taskId -> {
                    Task task = taskRepository.findById(taskId)
                            .orElseThrow(() -> new ResourceNotFoundException("TASK_NOT_FOUND"));
                    if (!task.getProjectId().equals(sprint.getProjectId())) {
                        throw new ForbiddenException("TASK_WRONG_PROJECT");
                    }
                    // Subtasks cannot be assigned to sprint directly
                    if (task.getParentId() != null) {
                        throw new ConflictException("SUBTASKS_FOLLOW_PARENT");
                    }

                    task.setSprintId(sprintId);
                    taskRepository.save(task);

                    activityService.record(task.getId(), callerId, TaskActivityType.SPRINT_ADDED,
                            null, sprint.getName());

                    // If STORY, propagate to non-DONE children
                    if (task.getType() == TaskType.STORY) {
                        taskRepository.findByParentId(taskId).stream()
                                .filter(child -> !doneStatuses.contains(child.getStatus()))
                                .forEach(child -> {
                                    child.setSprintId(sprintId);
                                    taskRepository.save(child);
                                    activityService.record(child.getId(), callerId, TaskActivityType.SPRINT_ADDED,
                                            null, sprint.getName());
                                });
                    }

                    return taskService.toDto(task);
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

        if (sprint.getStatus() == SprintStatus.PLANNING || sprint.getStatus() == SprintStatus.ACTIVE) {
            requireDeveloper(perms);
        } else {
            throw new ForbiddenException("CAN_ONLY_REMOVE_TASKS_FROM_PLANNING_OR_ACTIVE_SPRINT");
        }

        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("TASK_NOT_FOUND"));
        if (!sprintId.equals(task.getSprintId())) {
            throw new ResourceNotFoundException("TASK_NOT_IN_SPRINT");
        }
        // Subtasks cannot be removed from sprint directly
        if (task.getParentId() != null) {
            throw new ConflictException("SUBTASKS_FOLLOW_PARENT");
        }

        task.setSprintId(null);
        taskRepository.save(task);

        // If STORY, also remove children from this sprint
        if (task.getType() == TaskType.STORY) {
            taskRepository.findByParentIdAndSprintId(taskId, sprintId)
                    .forEach(child -> {
                        child.setSprintId(null);
                        taskRepository.save(child);
                    });
        }

        TaskResponseDto result = taskService.toDto(task);
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

    // ── filter helpers ─────────────────────────────────────────────────────

    private Specification<Task> applyFilters(Specification<Task> spec,
                                             List<String> priorities,
                                             List<UUID> assigneeIds,
                                             List<UUID> labelIds,
                                             List<String> statuses,
                                             List<UUID> epicIds,
                                             String search) {
        if (priorities != null && !priorities.isEmpty()) {
            List<TaskPriority> parsed = priorities.stream()
                    .map(p -> TaskPriority.valueOf(p.toUpperCase()))
                    .toList();
            spec = spec.and(TaskSpecifications.hasPriorityIn(parsed));
        }
        if (assigneeIds != null && !assigneeIds.isEmpty()) {
            spec = spec.and(TaskSpecifications.hasAssigneeIn(assigneeIds));
        }
        if (labelIds != null && !labelIds.isEmpty()) {
            spec = spec.and(TaskSpecifications.hasLabelIn(labelIds));
        }
        if (statuses != null && !statuses.isEmpty()) {
            spec = spec.and(TaskSpecifications.hasStatusIn(statuses));
        }
        if (epicIds != null && !epicIds.isEmpty()) {
            spec = spec.and(TaskSpecifications.hasEpicIdIn(epicIds));
        }
        if (search != null && !search.isBlank()) {
            spec = spec.and(TaskSpecifications.titleContains(search.trim()));
        }
        return spec;
    }

    private Specification<Task> applyReadyFilter(Specification<Task> spec, List<Boolean> ready) {
        if (ready == null || ready.isEmpty()) {
            return spec;
        }
        List<Boolean> distinct = ready.stream().distinct().toList();
        if (distinct.size() != 1) {
            return spec;
        }
        return spec.and(TaskSpecifications.hasReady(distinct.get(0)));
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private Sprint getSprintOrThrow(UUID id) {
        return sprintRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("SPRINT_NOT_FOUND"));
    }

    private MemberPermissionsDto requireMember(UUID projectId, UUID userId) {
        return projectServiceClient.getMemberPermissions(projectId, userId);
    }

    private boolean isProjectDeveloper(MemberPermissionsDto p) {
        return p.projectMember() && "DEVELOPER".equals(p.scrumRole());
    }

    private void requireScrumMaster(MemberPermissionsDto p) {
        if ("SCRUM_MASTER".equals(p.scrumRole())) return;
        throw new ForbiddenException("SCRUM_MASTER_REQUIRED");
    }

    private void requireDeveloper(MemberPermissionsDto p) {
        if (isProjectDeveloper(p)) return;
        throw new ForbiddenException("DEVELOPER_REQUIRED");
    }

    private void validateDateRange(LocalDate startDate, LocalDate endDate) {
        if (startDate != null && endDate != null && endDate.isBefore(startDate)) {
            throw new IllegalArgumentException("SPRINT_END_DATE_BEFORE_START_DATE");
        }
    }

    private void validateNoOverlap(UUID projectId, UUID excludeId, LocalDate startDate, LocalDate endDate) {
        if (startDate != null && endDate != null &&
                sprintRepository.existsOverlapping(projectId, excludeId, startDate, endDate)) {
            throw new IllegalArgumentException("SPRINT_DATES_OVERLAP");
        }
    }

    private Sprint getNextPlanningSprintToStart(UUID projectId, LocalDate today) {
        return sprintRepository.findAllByProjectIdAndStatus(projectId, SprintStatus.PLANNING)
                .stream()
                .filter(s -> s.getStartDate() != null)
                .min(Comparator
                        .comparingLong((Sprint s) -> Math.abs(ChronoUnit.DAYS.between(today, s.getStartDate())))
                        .thenComparing(Sprint::getStartDate)
                        .thenComparing(Sprint::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(Sprint::getId))
                .orElseThrow(() -> new ConflictException("SPRINT_NOT_NEXT_TO_START"));
    }
}
