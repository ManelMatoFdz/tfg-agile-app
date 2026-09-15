package com.tfg.agile.app.task_service.dto;

import java.util.UUID;

public record LabelUsageDto(
        UUID labelId,
        long taskCount
) {
}
