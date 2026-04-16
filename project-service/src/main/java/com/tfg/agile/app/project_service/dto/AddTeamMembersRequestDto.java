package com.tfg.agile.app.project_service.dto;

import java.util.List;
import java.util.UUID;

public record AddTeamMembersRequestDto(
        List<UUID> userIds
) {}