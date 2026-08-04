package com.tfg.agile.app.task_service.service;

import com.tfg.agile.app.task_service.client.MemberPermissionsDto;
import com.tfg.agile.app.task_service.client.ProjectServiceClient;
import com.tfg.agile.app.task_service.dto.*;
import com.tfg.agile.app.task_service.dto.TaskResponseDto.EpicInfo;
import com.tfg.agile.app.task_service.dto.TaskResponseDto.SubtaskInfo;
import com.tfg.agile.app.task_service.entity.*;
import com.tfg.agile.app.task_service.exception.ConflictException;
import com.tfg.agile.app.task_service.exception.ForbiddenException;
import com.tfg.agile.app.task_service.exception.ResourceNotFoundException;
import com.tfg.agile.app.task_service.repository.EpicRepository;
import com.tfg.agile.app.task_service.repository.TaskRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class EpicService {

    private final EpicRepository epicRepository;
    private final TaskRepository taskRepository;
    private final ProjectServiceClient projectServiceClient;
    private final BoardColumnService boardColumnService;
    private final ActivityService activityService;

    public EpicService(EpicRepository epicRepository,
                       TaskRepository taskRepository,
                       ProjectServiceClient projectServiceClient,
                       BoardColumnService boardColumnService,
                       ActivityService activityService) {
        this.epicRepository = epicRepository;
        this.taskRepository = taskRepository;
        this.projectServiceClient = projectServiceClient;
        this.boardColumnService = boardColumnService;
        this.activityService = activityService;
    }

    @Transactional(readOnly = true)
    public List<EpicResponseDto> findByProject(UUID projectId, UUID callerId) {
        projectServiceClient.getMemberPermissions(projectId, callerId);
        List<Epic> epics = epicRepository.findByProjectIdOrderByNameAsc(projectId);
        Set<String> doneStatuses = boardColumnService.getDoneEquivalentStatuses(projectId);
        return epics.stream().map(e -> toDto(e, doneStatuses)).toList();
    }

    @Transactional(readOnly = true)
    public EpicResponseDto findById(UUID epicId, UUID callerId) {
        Epic epic = getEpicOrThrow(epicId);
        projectServiceClient.getMemberPermissions(epic.getProjectId(), callerId);
        Set<String> doneStatuses = boardColumnService.getDoneEquivalentStatuses(epic.getProjectId());
        return toDto(epic, doneStatuses);
    }

    @Transactional(readOnly = true)
    public List<TaskResponseDto> findTasksByEpic(UUID epicId, UUID callerId) {
        Epic epic = getEpicOrThrow(epicId);
        projectServiceClient.getMemberPermissions(epic.getProjectId(), callerId);
        EpicInfo epicInfo = new EpicInfo(epic.getName(), epic.getColor());
        return taskRepository.findByEpicIdOrderByPositionAsc(epicId).stream()
                .map(t -> TaskResponseDto.from(t, SubtaskInfo.EMPTY, epicInfo))
                .toList();
    }

    @Transactional
    public EpicResponseDto create(UUID projectId, CreateEpicRequestDto dto, UUID callerId) {
        MemberPermissionsDto perms = projectServiceClient.getMemberPermissions(projectId, callerId);
        requirePoOrAdmin(perms);

        Epic epic = Epic.builder()
                .projectId(projectId)
                .name(dto.name())
                .description(dto.description())
                .color(dto.color() != null ? dto.color() : "#6B7280")
                .startDate(dto.startDate())
                .targetDate(dto.targetDate())
                .createdBy(callerId)
                .build();

        Epic saved = epicRepository.save(epic);
        projectServiceClient.touchProject(projectId);
        return toDto(saved, Set.of());
    }

    @Transactional
    public EpicResponseDto update(UUID epicId, UpdateEpicRequestDto dto, UUID callerId) {
        Epic epic = getEpicOrThrow(epicId);
        MemberPermissionsDto perms = projectServiceClient.getMemberPermissions(epic.getProjectId(), callerId);
        requirePoOrAdmin(perms);

        epic.setName(dto.name());
        epic.setDescription(dto.description());
        if (dto.color() != null) {
            epic.setColor(dto.color());
        }
        if (dto.status() != null) {
            epic.setStatus(EpicStatus.valueOf(dto.status().toUpperCase()));
        }
        epic.setStartDate(dto.startDate());
        epic.setTargetDate(dto.targetDate());

        Epic saved = epicRepository.save(epic);
        Set<String> doneStatuses = boardColumnService.getDoneEquivalentStatuses(epic.getProjectId());
        projectServiceClient.touchProject(epic.getProjectId());
        return toDto(saved, doneStatuses);
    }

    @Transactional
    public void delete(UUID epicId, UUID callerId) {
        Epic epic = getEpicOrThrow(epicId);
        MemberPermissionsDto perms = projectServiceClient.getMemberPermissions(epic.getProjectId(), callerId);
        requirePoOrAdmin(perms);

        // Unlink all tasks from this epic
        List<Task> tasks = taskRepository.findByEpicIdOrderByPositionAsc(epicId);
        for (Task task : tasks) {
            task.setEpicId(null);
        }
        taskRepository.saveAll(tasks);

        epicRepository.delete(epic);
        projectServiceClient.touchProject(epic.getProjectId());
    }

    @Transactional
    public TaskResponseDto assignEpicToTask(UUID taskId, UUID epicId, UUID callerId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("TASK_NOT_FOUND"));
        MemberPermissionsDto perms = projectServiceClient.getMemberPermissions(task.getProjectId(), callerId);
        requirePoOrAdmin(perms);

        String oldEpicName = null;
        String newEpicName = null;

        if (task.getEpicId() != null) {
            oldEpicName = epicRepository.findById(task.getEpicId())
                    .map(Epic::getName).orElse(null);
        }

        if (epicId != null) {
            Epic epic = getEpicOrThrow(epicId);
            if (!epic.getProjectId().equals(task.getProjectId())) {
                throw new ConflictException("EPIC_WRONG_PROJECT");
            }
            task.setEpicId(epicId);
            newEpicName = epic.getName();
        } else {
            task.setEpicId(null);
        }

        Task saved = taskRepository.save(task);

        if (!Objects.equals(oldEpicName, newEpicName)) {
            activityService.record(saved.getId(), callerId, TaskActivityType.EPIC_CHANGED,
                    oldEpicName, newEpicName);
        }

        EpicInfo epicInfo = EpicInfo.EMPTY;
        if (saved.getEpicId() != null) {
            epicInfo = epicRepository.findById(saved.getEpicId())
                    .map(e -> new EpicInfo(e.getName(), e.getColor()))
                    .orElse(EpicInfo.EMPTY);
        }

        return TaskResponseDto.from(saved, SubtaskInfo.EMPTY, epicInfo);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private Epic getEpicOrThrow(UUID id) {
        return epicRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("EPIC_NOT_FOUND"));
    }

    private void requirePoOrAdmin(MemberPermissionsDto perms) {
        boolean isAdmin = perms.workspaceAdmin() || perms.teamAdmin();
        boolean isPo = "PRODUCT_OWNER".equals(perms.scrumRole());
        if (!isAdmin && !isPo) {
            throw new ForbiddenException("ONLY_PO_OR_ADMIN_CAN_MANAGE_EPICS");
        }
    }

    private EpicResponseDto toDto(Epic epic, Set<String> doneStatuses) {
        int totalTasks = taskRepository.countByEpicId(epic.getId());
        int doneTasks = doneStatuses.isEmpty() ? 0
                : taskRepository.countByEpicIdAndStatusIn(epic.getId(), doneStatuses);
        return EpicResponseDto.from(epic, totalTasks, doneTasks);
    }
}