package com.tfg.agile.app.project_service.controller;

import com.tfg.agile.app.project_service.dto.CreateInvitationRequestDto;
import com.tfg.agile.app.project_service.dto.WorkspaceInvitationResponseDto;
import com.tfg.agile.app.project_service.service.WorkspaceInvitationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
public class WorkspaceInvitationController {

    private final WorkspaceInvitationService invitationService;

    public WorkspaceInvitationController(WorkspaceInvitationService invitationService) {
        this.invitationService = invitationService;
    }

    @GetMapping("/invitations/pending")
    public List<WorkspaceInvitationResponseDto> getPending(@AuthenticationPrincipal UUID callerId) {
        return invitationService.getPendingInvitations(callerId);
    }

    @PostMapping("/workspaces/{workspaceId}/invitations")
    public ResponseEntity<WorkspaceInvitationResponseDto> create(
            @PathVariable("workspaceId") UUID workspaceId,
            @Valid @RequestBody CreateInvitationRequestDto dto,
            @AuthenticationPrincipal UUID callerId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(invitationService.createInvitation(workspaceId, dto, callerId));
    }

    @PostMapping("/invitations/{invitationId}/accept")
    public WorkspaceInvitationResponseDto accept(
            @PathVariable("invitationId") UUID invitationId,
            @AuthenticationPrincipal UUID callerId) {
        return invitationService.acceptInvitation(invitationId, callerId);
    }

    @PostMapping("/invitations/{invitationId}/reject")
    public WorkspaceInvitationResponseDto reject(
            @PathVariable("invitationId") UUID invitationId,
            @AuthenticationPrincipal UUID callerId) {
        return invitationService.rejectInvitation(invitationId, callerId);
    }
}