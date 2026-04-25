package com.tfg.agile.app.project_service.dto;

import com.tfg.agile.app.project_service.entity.ProjectMember;
import com.tfg.agile.app.project_service.entity.ProjectRole;
import com.tfg.agile.app.project_service.entity.ScrumRole;

import java.time.Instant;
import java.util.UUID;

public record ProjectMemberResponseDto(
        UUID id,
        UUID userId,
        ProjectRole role,
        ScrumRole scrumRole,
        Instant joinedAt
) {
    public static ProjectMemberResponseDto from(ProjectMember m) {
        return new ProjectMemberResponseDto(m.getId(), m.getUserId(), m.getRole(), m.getScrumRole(), m.getJoinedAt());
    }
}