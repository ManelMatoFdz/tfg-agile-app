package com.tfg.agile.app.task_service.dto;

import com.tfg.agile.app.task_service.entity.Task;
import com.tfg.agile.app.task_service.entity.TaskPriority;
import com.tfg.agile.app.task_service.entity.TaskType;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record TaskResponseDto(
        UUID id,
        UUID projectId,
        UUID sprintId,
        UUID epicId,
        String epicName,
        String epicColor,
        String title,
        String description,
        String status,
        TaskPriority priority,
        TaskType type,
        UUID parentId,
        UUID reporterId,
        UUID assigneeId,
        Instant completedAt,
        Integer storyPoints,
        boolean ready,
        int position,
        List<LabelDto> labels,
        int subtaskCount,
        int completedSubtaskCount,
        String parentTitle,
        String definitionOfDone,
        int blockedByCount,
        int blocksCount,
        int gitEventCount,
        Instant createdAt,
        Instant updatedAt
) {

    public record SubtaskInfo(int subtaskCount, int completedSubtaskCount, String parentTitle) {
        public static final SubtaskInfo EMPTY = new SubtaskInfo(0, 0, null);
    }

    public record EpicInfo(String name, String color) {
        public static final EpicInfo EMPTY = new EpicInfo(null, null);
    }

    public record DependencyInfo(int blockedByCount, int blocksCount) {
        public static final DependencyInfo EMPTY = new DependencyInfo(0, 0);
    }

    public static TaskResponseDto from(Task t, SubtaskInfo info, EpicInfo epicInfo, DependencyInfo depInfo,
                                       int gitEventCount) {
        List<LabelDto> labelDtos = t.getLabels() != null
                ? t.getLabels().stream().map(LabelDto::from).toList()
                : List.of();
        TaskType type = t.getType() != null ? t.getType() : TaskType.TASK;
        return new TaskResponseDto(
                t.getId(), t.getProjectId(), t.getSprintId(),
                t.getEpicId(), epicInfo.name(), epicInfo.color(),
                t.getTitle(), t.getDescription(),
                t.getStatus(), t.getPriority(), type, t.getParentId(),
                t.getReporterId(), t.getAssigneeId(),
                t.getCompletedAt(), t.getStoryPoints(), t.isReady(), t.getPosition(), labelDtos,
                info.subtaskCount(), info.completedSubtaskCount(), info.parentTitle(),
                t.getDefinitionOfDone(),
                depInfo.blockedByCount(), depInfo.blocksCount(), gitEventCount,
                t.getCreatedAt(), t.getUpdatedAt()
        );
    }

    public static TaskResponseDto from(Task t, SubtaskInfo info, EpicInfo epicInfo, DependencyInfo depInfo) {
        return from(t, info, epicInfo, depInfo, 0);
    }

    public static TaskResponseDto from(Task t, SubtaskInfo info, EpicInfo epicInfo) {
        return from(t, info, epicInfo, DependencyInfo.EMPTY);
    }

    public static TaskResponseDto from(Task t, SubtaskInfo info) {
        return from(t, info, EpicInfo.EMPTY, DependencyInfo.EMPTY);
    }

    public static TaskResponseDto from(Task t) {
        return from(t, SubtaskInfo.EMPTY, EpicInfo.EMPTY, DependencyInfo.EMPTY);
    }
}