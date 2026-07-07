package com.tfg.agile.app.project_service.dto;

import com.tfg.agile.app.project_service.entity.ScrumRole;

public record MemberPermissionsDto(
        boolean workspaceAdmin,
        boolean teamAdmin,
        ScrumRole scrumRole
) {}