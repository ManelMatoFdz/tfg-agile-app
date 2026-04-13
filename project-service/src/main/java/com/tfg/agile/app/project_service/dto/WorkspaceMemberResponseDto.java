package com.tfg.agile.app.project_service.dto;

import com.tfg.agile.app.project_service.entity.WorkspaceMember;
import com.tfg.agile.app.project_service.entity.WorkspaceRole;

import java.time.Instant;
import java.util.UUID;

public record WorkspaceMemberResponseDto(
        UUID id,
        UUID userId,
        WorkspaceRole role,
        Instant joinedAt
) {
    public static WorkspaceMemberResponseDto from(WorkspaceMember m) {
        return new WorkspaceMemberResponseDto(m.getId(), m.getUserId(), m.getRole(), m.getJoinedAt());
    }
}