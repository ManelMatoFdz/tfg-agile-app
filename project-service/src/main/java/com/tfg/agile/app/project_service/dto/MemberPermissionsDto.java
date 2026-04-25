package com.tfg.agile.app.project_service.dto;

import com.tfg.agile.app.project_service.entity.ProjectRole;
import com.tfg.agile.app.project_service.entity.ScrumRole;

public record MemberPermissionsDto(
        ProjectRole role,
        ScrumRole scrumRole
) {}