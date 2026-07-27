package com.tfg.agile.app.task_service.client;

import java.util.UUID;

public record MemberPermissionsDto(
        UUID workspaceId,
        boolean workspaceAdmin,
        boolean teamAdmin,
        String scrumRole
) {}