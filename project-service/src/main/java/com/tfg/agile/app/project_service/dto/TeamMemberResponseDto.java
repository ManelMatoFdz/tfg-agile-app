package com.tfg.agile.app.project_service.dto;

import com.tfg.agile.app.project_service.entity.TeamMember;
import com.tfg.agile.app.project_service.entity.TeamRole;

import java.time.Instant;
import java.util.UUID;

public record TeamMemberResponseDto(
        UUID id,
        UUID userId,
        TeamRole role,
        Instant joinedAt
) {
    public static TeamMemberResponseDto from(TeamMember m) {
        return new TeamMemberResponseDto(m.getId(), m.getUserId(), m.getRole(), m.getJoinedAt());
    }
}