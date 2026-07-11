package com.tfg.agile.app.task_service.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateCommentRequestDto(
        @NotBlank String content
) {}