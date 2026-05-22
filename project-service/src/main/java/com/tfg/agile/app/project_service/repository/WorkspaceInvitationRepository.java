package com.tfg.agile.app.project_service.repository;

import com.tfg.agile.app.project_service.entity.InvitationStatus;
import com.tfg.agile.app.project_service.entity.WorkspaceInvitation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface WorkspaceInvitationRepository extends JpaRepository<WorkspaceInvitation, UUID> {

    boolean existsByWorkspaceIdAndInvitedEmailAndStatus(UUID workspaceId, String invitedEmail, InvitationStatus status);

    Optional<WorkspaceInvitation> findByIdAndInvitedUserId(UUID id, UUID invitedUserId);

    java.util.List<WorkspaceInvitation> findByInvitedUserIdAndStatus(UUID invitedUserId, InvitationStatus status);

    void deleteByWorkspaceIdAndInvitedEmailAndStatus(UUID workspaceId, String invitedEmail, InvitationStatus status);

    void deleteByWorkspaceId(UUID workspaceId);
}