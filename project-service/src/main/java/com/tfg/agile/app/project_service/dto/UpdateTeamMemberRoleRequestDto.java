package com.tfg.agile.app.project_service.dto;

import com.tfg.agile.app.project_service.entity.TeamRole;
import jakarta.validation.constraints.NotNull;

public record UpdateTeamMemberRoleRequestDto(
        @NotNull TeamRole role
) {}