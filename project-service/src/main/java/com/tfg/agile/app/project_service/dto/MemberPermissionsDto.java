package com.tfg.agile.app.project_service.dto;

import com.tfg.agile.app.project_service.entity.ScrumRole;

import java.util.UUID;

public record MemberPermissionsDto(
        UUID workspaceId,
        boolean workspaceAdmin,
        boolean teamAdmin,
        ScrumRole scrumRole
) {}