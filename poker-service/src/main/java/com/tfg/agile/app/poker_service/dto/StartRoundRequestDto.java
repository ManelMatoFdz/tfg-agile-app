package com.tfg.agile.app.poker_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record StartRoundRequestDto(
        @NotNull UUID taskId,
        @NotBlank String taskTitle
) {}