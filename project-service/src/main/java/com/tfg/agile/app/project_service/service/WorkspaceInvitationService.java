package com.tfg.agile.app.project_service.service;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;
import com.tfg.agile.app.project_service.client.UserServiceClient;
import com.tfg.agile.app.project_service.dto.CreateInvitationRequestDto;
import com.tfg.agile.app.project_service.dto.WorkspaceInvitationResponseDto;
import com.tfg.agile.app.project_service.entity.InvitationStatus;
import com.tfg.agile.app.project_service.entity.Workspace;
import com.tfg.agile.app.project_service.entity.WorkspaceInvitation;
import com.tfg.agile.app.project_service.entity.WorkspaceMember;
import com.tfg.agile.app.project_service.entity.WorkspaceRole;
import com.tfg.agile.app.project_service.exception.ConflictException;
import com.tfg.agile.app.project_service.exception.ForbiddenException;
import com.tfg.agile.app.project_service.exception.ResourceNotFoundException;
import com.tfg.agile.app.project_service.repository.WorkspaceInvitationRepository;
import com.tfg.agile.app.project_service.repository.WorkspaceMemberRepository;
import com.tfg.agile.app.project_service.repository.WorkspaceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Service
public class WorkspaceInvitationService {

    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository memberRepository;
    private final WorkspaceInvitationRepository invitationRepository;
    private final UserServiceClient userServiceClient;
    private final ObjectMapper objectMapper;

    public WorkspaceInvitationService(
            WorkspaceRepository workspaceRepository,
            WorkspaceMemberRepository memberRepository,
            WorkspaceInvitationRepository invitationRepository,
            UserServiceClient userServiceClient,
            ObjectMapper objectMapper) {
        this.workspaceRepository = workspaceRepository;
        this.memberRepository = memberRepository;
        this.invitationRepository = invitationRepository;
        this.userServiceClient = userServiceClient;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public java.util.List<WorkspaceInvitationResponseDto> getPendingInvitations(UUID userId) {
        return invitationRepository.findByInvitedUserIdAndStatus(userId, InvitationStatus.PENDING)
                .stream()
                .map(WorkspaceInvitationResponseDto::from)
                .toList();
    }

    @Transactional
    public WorkspaceInvitationResponseDto createInvitation(UUID workspaceId, CreateInvitationRequestDto dto, UUID callerId) {
        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("WORKSPACE_NOT_FOUND"));

        requireAdmin(workspaceId, callerId);

        UUID invitedUserId = dto.userId();

        if (memberRepository.existsByWorkspaceIdAndUserId(workspaceId, invitedUserId)) {
            throw new ConflictException("ALREADY_WORKSPACE_MEMBER");
        }

        if (invitationRepository.existsByWorkspaceIdAndInvitedEmailAndStatus(
                workspaceId, dto.email(), InvitationStatus.PENDING)) {
            throw new ConflictException("INVITATION_ALREADY_PENDING");
        }

        WorkspaceInvitation invitation = WorkspaceInvitation.builder()
                .workspace(workspace)
                .invitedEmail(dto.email())
                .invitedUserId(invitedUserId)
                .invitedByUserId(callerId)
                .status(InvitationStatus.PENDING)
                .build();
        invitationRepository.save(invitation);

        String data = toJson(Map.of(
                "invitationId", invitation.getId().toString(),
                "workspaceId", workspaceId.toString(),
                "workspaceName", workspace.getName()
        ));

        userServiceClient.sendNotification(
                invitedUserId,
                "Invitación al workspace",
                "Has sido invitado al workspace «" + workspace.getName() + "»",
                "WORKSPACE_INVITATION",
                "/workspaces",
                data,
                callerId
        );

        return WorkspaceInvitationResponseDto.from(invitation);
    }

    @Transactional
    public WorkspaceInvitationResponseDto acceptInvitation(UUID invitationId, UUID callerId) {
        WorkspaceInvitation invitation = invitationRepository.findByIdAndInvitedUserId(invitationId, callerId)
                .orElseThrow(() -> new ResourceNotFoundException("INVITATION_NOT_FOUND"));

        if (invitation.getStatus() != InvitationStatus.PENDING) {
            throw new ConflictException("INVITATION_NOT_PENDING");
        }

        UUID workspaceId = invitation.getWorkspace().getId();

        if (!memberRepository.existsByWorkspaceIdAndUserId(workspaceId, callerId)) {
            WorkspaceMember member = WorkspaceMember.builder()
                    .workspace(invitation.getWorkspace())
                    .userId(callerId)
                    .role(WorkspaceRole.MEMBER)
                    .build();
            memberRepository.save(member);
        }

        // Remove any previous ACCEPTED invitation for this workspace+email to avoid
        // unique constraint violation when the user rejoins after leaving the workspace.
        // flush() forces the DELETE to hit the DB before the subsequent UPDATE.
        invitationRepository.deleteByWorkspaceIdAndInvitedEmailAndStatus(
                workspaceId, invitation.getInvitedEmail(), InvitationStatus.ACCEPTED);
        invitationRepository.flush();

        invitation.setStatus(InvitationStatus.ACCEPTED);
        invitation.setUpdatedAt(Instant.now());
        return WorkspaceInvitationResponseDto.from(invitationRepository.save(invitation));
    }

    @Transactional
    public WorkspaceInvitationResponseDto rejectInvitation(UUID invitationId, UUID callerId) {
        WorkspaceInvitation invitation = invitationRepository.findByIdAndInvitedUserId(invitationId, callerId)
                .orElseThrow(() -> new ResourceNotFoundException("INVITATION_NOT_FOUND"));

        if (invitation.getStatus() != InvitationStatus.PENDING) {
            throw new ConflictException("INVITATION_NOT_PENDING");
        }

        invitation.setStatus(InvitationStatus.REJECTED);
        invitation.setUpdatedAt(Instant.now());
        return WorkspaceInvitationResponseDto.from(invitationRepository.save(invitation));
    }

    private void requireAdmin(UUID workspaceId, UUID userId) {
        if (!memberRepository.existsByWorkspaceIdAndUserIdAndRole(workspaceId, userId, WorkspaceRole.ADMIN)) {
            throw new ForbiddenException("WORKSPACE_ADMIN_REQUIRED");
        }
    }

    private String toJson(Map<String, String> map) {
        try {
            return objectMapper.writeValueAsString(map);
        } catch (JacksonException e) {
            return "{}";
        }
    }
}
