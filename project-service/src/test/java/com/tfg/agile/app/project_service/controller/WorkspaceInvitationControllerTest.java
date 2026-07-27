package com.tfg.agile.app.project_service.controller;

import com.tfg.agile.app.project_service.dto.CreateInvitationRequestDto;
import com.tfg.agile.app.project_service.dto.WorkspaceInvitationResponseDto;
import com.tfg.agile.app.project_service.service.WorkspaceInvitationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WorkspaceInvitationControllerTest {

    @Mock
    private WorkspaceInvitationService invitationService;

    @Test
    void getPending_delegatesToService() {
        WorkspaceInvitationController controller = new WorkspaceInvitationController(invitationService);
        UUID callerId = UUID.randomUUID();
        WorkspaceInvitationResponseDto dto = new WorkspaceInvitationResponseDto(
                UUID.randomUUID(), UUID.randomUUID(), "Workspace", "user@example.com",
                UUID.randomUUID(), UUID.randomUUID(), "PENDING", Instant.now());

        when(invitationService.getPendingInvitations(callerId)).thenReturn(List.of(dto));

        var result = controller.getPending(callerId);

        assertThat(result).hasSize(1);
        assertThat(result.get(0)).isEqualTo(dto);
    }

    @Test
    void create_delegatesToServiceWithCreatedStatus() {
        WorkspaceInvitationController controller = new WorkspaceInvitationController(invitationService);
        UUID workspaceId = UUID.randomUUID();
        UUID callerId = UUID.randomUUID();
        UUID invitedUserId = UUID.randomUUID();
        CreateInvitationRequestDto request = new CreateInvitationRequestDto(invitedUserId, "user@example.com");
        WorkspaceInvitationResponseDto dto = new WorkspaceInvitationResponseDto(
                UUID.randomUUID(), workspaceId, "Workspace", "user@example.com",
                invitedUserId, callerId, "PENDING", Instant.now());

        when(invitationService.createInvitation(workspaceId, request, callerId)).thenReturn(dto);

        var response = controller.create(workspaceId, request, callerId);

        assertThat(response.getStatusCode().value()).isEqualTo(201);
        assertThat(response.getBody()).isEqualTo(dto);
    }

    @Test
    void accept_delegatesToService() {
        WorkspaceInvitationController controller = new WorkspaceInvitationController(invitationService);
        UUID invitationId = UUID.randomUUID();
        UUID callerId = UUID.randomUUID();
        WorkspaceInvitationResponseDto dto = new WorkspaceInvitationResponseDto(
                invitationId, UUID.randomUUID(), "Workspace", "user@example.com",
                callerId, UUID.randomUUID(), "ACCEPTED", Instant.now());

        when(invitationService.acceptInvitation(invitationId, callerId)).thenReturn(dto);

        var result = controller.accept(invitationId, callerId);

        assertThat(result).isEqualTo(dto);
        verify(invitationService).acceptInvitation(invitationId, callerId);
    }

    @Test
    void reject_delegatesToService() {
        WorkspaceInvitationController controller = new WorkspaceInvitationController(invitationService);
        UUID invitationId = UUID.randomUUID();
        UUID callerId = UUID.randomUUID();
        WorkspaceInvitationResponseDto dto = new WorkspaceInvitationResponseDto(
                invitationId, UUID.randomUUID(), "Workspace", "user@example.com",
                callerId, UUID.randomUUID(), "REJECTED", Instant.now());

        when(invitationService.rejectInvitation(invitationId, callerId)).thenReturn(dto);

        var result = controller.reject(invitationId, callerId);

        assertThat(result).isEqualTo(dto);
        verify(invitationService).rejectInvitation(invitationId, callerId);
    }
}