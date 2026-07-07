package com.tfg.agile.app.project_service.dto;

import com.tfg.agile.app.project_service.entity.ScrumRole;
import com.tfg.agile.app.project_service.entity.TeamMember;
import com.tfg.agile.app.project_service.entity.TeamRole;

import java.time.Instant;
import java.util.UUID;

public record TeamMemberResponseDto(
        UUID id,
        UUID userId,
        TeamRole role,
        ScrumRole scrumRole,
        Instant joinedAt,
        Instant lastActiveAt
) {
    public static TeamMemberResponseDto from(TeamMember m) {
        return new TeamMemberResponseDto(m.getId(), m.getUserId(), m.getRole(), m.getScrumRole(), m.getJoinedAt(), m.getLastActiveAt());
    }
}