package com.tfg.agile.app.project_service.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record CreateInvitationRequestDto(
        @NotNull UUID userId,
        @NotBlank @Email String email
) {}