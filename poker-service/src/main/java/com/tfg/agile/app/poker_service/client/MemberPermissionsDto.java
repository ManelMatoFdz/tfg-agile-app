package com.tfg.agile.app.poker_service.client;

import java.util.UUID;

public record MemberPermissionsDto(
        UUID workspaceId,
        boolean workspaceAdmin,
        boolean teamAdmin,
        boolean projectMember,
        String scrumRole
) {}
