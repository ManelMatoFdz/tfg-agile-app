package com.tfg.agile.app.project_service.dto;

import com.tfg.agile.app.project_service.entity.WorkspaceInvitation;

import java.time.Instant;
import java.util.UUID;

public record WorkspaceInvitationResponseDto(
        UUID id,
        UUID workspaceId,
        String workspaceName,
        String invitedEmail,
        UUID invitedUserId,
        UUID invitedByUserId,
        String status,
        Instant createdAt
) {
    public static WorkspaceInvitationResponseDto from(WorkspaceInvitation inv) {
        return new WorkspaceInvitationResponseDto(
                inv.getId(),
                inv.getWorkspace().getId(),
                inv.getWorkspace().getName(),
                inv.getInvitedEmail(),
                inv.getInvitedUserId(),
                inv.getInvitedByUserId(),
                inv.getStatus().name(),
                inv.getCreatedAt()
        );
    }
}