package com.tfg.agile.app.project_service.dto;

import com.tfg.agile.app.project_service.entity.TeamMember;

import java.time.Instant;
import java.util.UUID;

public record TeamMemberResponseDto(
        UUID id,
        UUID userId,
        Instant joinedAt
) {
    public static TeamMemberResponseDto from(TeamMember m) {
        return new TeamMemberResponseDto(m.getId(), m.getUserId(), m.getJoinedAt());
    }
}