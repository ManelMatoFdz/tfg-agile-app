package com.tfg.agile.app.poker_service.client;

import java.util.List;
import java.util.UUID;

public record ProjectMemberIdsDto(
        UUID workspaceId,
        List<UUID> memberUserIds
) {}