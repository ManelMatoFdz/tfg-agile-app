package com.tfg.agile.app.project_service.dto;

import java.util.List;
import java.util.UUID;

public record ProjectMemberIdsDto(
        UUID workspaceId,
        List<UUID> memberUserIds
) {}