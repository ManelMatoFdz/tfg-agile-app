package com.tfg.agile.app.project_service.service;

import tools.jackson.databind.ObjectMapper;
import com.tfg.agile.app.project_service.client.UserServiceClient;
import com.tfg.agile.app.project_service.dto.CreateInvitationRequestDto;
import com.tfg.agile.app.project_service.dto.WorkspaceInvitationResponseDto;
import com.tfg.agile.app.project_service.entity.InvitationStatus;
import com.tfg.agile.app.project_service.entity.Workspace;
import com.tfg.agile.app.project_service.entity.WorkspaceInvitation;
import com.tfg.agile.app.project_service.entity.WorkspaceRole;
import com.tfg.agile.app.project_service.exception.ConflictException;
import com.tfg.agile.app.project_service.exception.ForbiddenException;
import com.tfg.agile.app.project_service.exception.ResourceNotFoundException;
import com.tfg.agile.app.project_service.repository.WorkspaceInvitationRepository;
import com.tfg.agile.app.project_service.repository.WorkspaceMemberRepository;
import com.tfg.agile.app.project_service.repository.WorkspaceRepository;
import com.tfg.agile.app.project_service.support.TestDataFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WorkspaceInvitationServiceTest {

    @Mock private WorkspaceRepository workspaceRepository;
    @Mock private WorkspaceMemberRepository memberRepository;
    @Mock private WorkspaceInvitationRepository invitationRepository;
    @Mock private UserServiceClient userServiceClient;
    @Mock private ObjectMapper objectMapper;

    private WorkspaceInvitationService service;

    @BeforeEach
    void setUp() {
        service = new WorkspaceInvitationService(
                workspaceRepository,
                memberRepository,
                invitationRepository,
                userServiceClient,
                objectMapper
        );
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private WorkspaceInvitation buildInvitation(Workspace workspace, UUID invitedUserId, InvitationStatus status) {
        Instant now = Instant.now();
        return WorkspaceInvitation.builder()
                .id(UUID.randomUUID())
                .workspace(workspace)
                .invitedEmail("user@example.com")
                .invitedUserId(invitedUserId)
                .invitedByUserId(UUID.randomUUID())
                .status(status)
                .createdAt(now)
                .updatedAt(now)
                .build();
    }

    // ── getPendingInvitations ─────────────────────────────────────────────────

    @Test
    void getPendingInvitations_returnsPendingInvitations() {
        UUID userId = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        WorkspaceInvitation invitation = buildInvitation(workspace, userId, InvitationStatus.PENDING);

        when(invitationRepository.findByInvitedUserIdAndStatus(userId, InvitationStatus.PENDING))
                .thenReturn(List.of(invitation));

        List<WorkspaceInvitationResponseDto> result = service.getPendingInvitations(userId);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).id()).isEqualTo(invitation.getId());
        assertThat(result.get(0).status()).isEqualTo("PENDING");
    }

    // ── createInvitation ──────────────────────────────────────────────────────

    @Test
    void createInvitation_savesInvitationAndSendsNotification() throws Exception {
        UUID callerId = UUID.randomUUID();
        UUID invitedUserId = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();

        when(workspaceRepository.findById(workspace.getId())).thenReturn(Optional.of(workspace));
        when(memberRepository.existsByWorkspaceIdAndUserIdAndRole(workspace.getId(), callerId, WorkspaceRole.ADMIN)).thenReturn(true);
        when(memberRepository.existsByWorkspaceIdAndUserId(workspace.getId(), invitedUserId)).thenReturn(false);
        when(invitationRepository.existsByWorkspaceIdAndInvitedEmailAndStatus(workspace.getId(), "user@example.com", InvitationStatus.PENDING)).thenReturn(false);
        when(invitationRepository.save(any(WorkspaceInvitation.class))).thenAnswer(inv -> {
            WorkspaceInvitation saved = inv.getArgument(0);
            saved.setId(UUID.randomUUID());
            saved.setCreatedAt(Instant.now());
            saved.setUpdatedAt(Instant.now());
            return saved;
        });
        lenient().when(objectMapper.writeValueAsString(any())).thenReturn("{}");

        var result = service.createInvitation(workspace.getId(), new CreateInvitationRequestDto(invitedUserId, "user@example.com"), callerId);

        assertThat(result.status()).isEqualTo("PENDING");
        assertThat(result.invitedUserId()).isEqualTo(invitedUserId);
        verify(invitationRepository).save(any(WorkspaceInvitation.class));
        verify(userServiceClient).sendNotification(eq(invitedUserId), anyString(), anyString(), eq("WORKSPACE_INVITATION"), anyString(), anyString());
    }

    @Test
    void createInvitation_throwsWhenNotAdmin() {
        UUID callerId = UUID.randomUUID();
        UUID invitedUserId = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();

        when(workspaceRepository.findById(workspace.getId())).thenReturn(Optional.of(workspace));
        when(memberRepository.existsByWorkspaceIdAndUserIdAndRole(workspace.getId(), callerId, WorkspaceRole.ADMIN)).thenReturn(false);

        assertThatThrownBy(() -> service.createInvitation(workspace.getId(), new CreateInvitationRequestDto(invitedUserId, "user@example.com"), callerId))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("WORKSPACE_ADMIN_REQUIRED");
    }

    @Test
    void createInvitation_throwsWhenAlreadyMember() {
        UUID callerId = UUID.randomUUID();
        UUID invitedUserId = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();

        when(workspaceRepository.findById(workspace.getId())).thenReturn(Optional.of(workspace));
        when(memberRepository.existsByWorkspaceIdAndUserIdAndRole(workspace.getId(), callerId, WorkspaceRole.ADMIN)).thenReturn(true);
        when(memberRepository.existsByWorkspaceIdAndUserId(workspace.getId(), invitedUserId)).thenReturn(true);

        assertThatThrownBy(() -> service.createInvitation(workspace.getId(), new CreateInvitationRequestDto(invitedUserId, "user@example.com"), callerId))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("ALREADY_WORKSPACE_MEMBER");
    }

    @Test
    void createInvitation_throwsWhenPendingInvitationExists() {
        UUID callerId = UUID.randomUUID();
        UUID invitedUserId = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();

        when(workspaceRepository.findById(workspace.getId())).thenReturn(Optional.of(workspace));
        when(memberRepository.existsByWorkspaceIdAndUserIdAndRole(workspace.getId(), callerId, WorkspaceRole.ADMIN)).thenReturn(true);
        when(memberRepository.existsByWorkspaceIdAndUserId(workspace.getId(), invitedUserId)).thenReturn(false);
        when(invitationRepository.existsByWorkspaceIdAndInvitedEmailAndStatus(workspace.getId(), "user@example.com", InvitationStatus.PENDING)).thenReturn(true);

        assertThatThrownBy(() -> service.createInvitation(workspace.getId(), new CreateInvitationRequestDto(invitedUserId, "user@example.com"), callerId))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("INVITATION_ALREADY_PENDING");
    }

    // ── acceptInvitation ──────────────────────────────────────────────────────

    @Test
    void acceptInvitation_createsMemberAndSetsAccepted() {
        UUID callerId = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        WorkspaceInvitation invitation = buildInvitation(workspace, callerId, InvitationStatus.PENDING);

        when(invitationRepository.findByIdAndInvitedUserId(invitation.getId(), callerId)).thenReturn(Optional.of(invitation));
        when(memberRepository.existsByWorkspaceIdAndUserId(workspace.getId(), callerId)).thenReturn(false);
        when(invitationRepository.save(invitation)).thenReturn(invitation);

        var result = service.acceptInvitation(invitation.getId(), callerId);

        assertThat(result.status()).isEqualTo("ACCEPTED");
        verify(memberRepository).save(any());
        verify(invitationRepository).deleteByWorkspaceIdAndInvitedEmailAndStatus(workspace.getId(), invitation.getInvitedEmail(), InvitationStatus.ACCEPTED);
        verify(invitationRepository).flush();
    }

    @Test
    void acceptInvitation_throwsWhenNotFound() {
        UUID invitationId = UUID.randomUUID();
        UUID callerId = UUID.randomUUID();

        when(invitationRepository.findByIdAndInvitedUserId(invitationId, callerId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.acceptInvitation(invitationId, callerId))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("INVITATION_NOT_FOUND");
    }

    @Test
    void acceptInvitation_throwsWhenNotPending() {
        UUID callerId = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        WorkspaceInvitation invitation = buildInvitation(workspace, callerId, InvitationStatus.ACCEPTED);

        when(invitationRepository.findByIdAndInvitedUserId(invitation.getId(), callerId)).thenReturn(Optional.of(invitation));

        assertThatThrownBy(() -> service.acceptInvitation(invitation.getId(), callerId))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("INVITATION_NOT_PENDING");
    }

    // ── rejectInvitation ──────────────────────────────────────────────────────

    @Test
    void rejectInvitation_setsRejectedStatus() {
        UUID callerId = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        WorkspaceInvitation invitation = buildInvitation(workspace, callerId, InvitationStatus.PENDING);

        when(invitationRepository.findByIdAndInvitedUserId(invitation.getId(), callerId)).thenReturn(Optional.of(invitation));
        when(invitationRepository.save(invitation)).thenReturn(invitation);

        var result = service.rejectInvitation(invitation.getId(), callerId);

        assertThat(result.status()).isEqualTo("REJECTED");
    }

    @Test
    void rejectInvitation_throwsWhenNotPending() {
        UUID callerId = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        WorkspaceInvitation invitation = buildInvitation(workspace, callerId, InvitationStatus.REJECTED);

        when(invitationRepository.findByIdAndInvitedUserId(invitation.getId(), callerId)).thenReturn(Optional.of(invitation));

        assertThatThrownBy(() -> service.rejectInvitation(invitation.getId(), callerId))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("INVITATION_NOT_PENDING");
    }
}