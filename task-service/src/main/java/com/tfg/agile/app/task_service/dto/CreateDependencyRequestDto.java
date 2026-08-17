package com.tfg.agile.app.task_service.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record CreateDependencyRequestDto(
        @NotNull UUID blockedTaskId
) {}
