package com.tfg.agile.app.task_service.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record SaveBoardColumnsRequestDto(
        @NotEmpty @Valid List<BoardColumnDto> columns
) {}