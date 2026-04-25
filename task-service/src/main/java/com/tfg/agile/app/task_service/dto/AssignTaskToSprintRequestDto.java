package com.tfg.agile.app.task_service.dto;

import java.util.List;
import java.util.UUID;

public record AssignTaskToSprintRequestDto(
        List<UUID> taskIds
) {}
