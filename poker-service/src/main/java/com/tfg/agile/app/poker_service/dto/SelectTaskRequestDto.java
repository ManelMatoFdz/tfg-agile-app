package com.tfg.agile.app.poker_service.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record SelectTaskRequestDto(
        @NotNull UUID taskId
) {}