package com.tfg.agile.app.task_service.client;

public record MemberPermissionsDto(
        boolean workspaceAdmin,
        boolean teamAdmin,
        String scrumRole
) {}