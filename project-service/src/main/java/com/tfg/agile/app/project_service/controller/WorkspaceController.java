package com.tfg.agile.app.project_service.controller;

import com.tfg.agile.app.project_service.dto.*;
import com.tfg.agile.app.project_service.service.WorkspaceService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/workspaces")
public class WorkspaceController {

    private final WorkspaceService workspaceService;

    public WorkspaceController(WorkspaceService workspaceService) {
        this.workspaceService = workspaceService;
    }

    @PostMapping
    public ResponseEntity<WorkspaceResponseDto> create(
            @Valid @RequestBody CreateWorkspaceRequestDto dto,
            @AuthenticationPrincipal UUID callerId) {
        return ResponseEntity.status(HttpStatus.CREATED).body(workspaceService.create(dto, callerId));
    }

    @GetMapping
    public List<WorkspaceResponseDto> listMine(@AuthenticationPrincipal UUID callerId) {
        return workspaceService.findAllByUser(callerId);
    }

    @GetMapping("/{workspaceId}")
    public WorkspaceResponseDto getById(@PathVariable UUID workspaceId,
                                        @AuthenticationPrincipal UUID callerId) {
        return workspaceService.findById(workspaceId, callerId);
    }

    @PutMapping("/{workspaceId}")
    public WorkspaceResponseDto update(@PathVariable UUID workspaceId,
                                       @Valid @RequestBody UpdateWorkspaceRequestDto dto,
                                       @AuthenticationPrincipal UUID callerId) {
        return workspaceService.update(workspaceId, dto, callerId);
    }

    @DeleteMapping("/{workspaceId}")
    public ResponseEntity<Void> delete(@PathVariable UUID workspaceId,
                                       @AuthenticationPrincipal UUID callerId) {
        workspaceService.delete(workspaceId, callerId);
        return ResponseEntity.noContent().build();
    }

    // ── members ──────────────────────────────────────────────────────────────

    @GetMapping("/{workspaceId}/members")
    public List<WorkspaceMemberResponseDto> getMembers(@PathVariable UUID workspaceId,
                                                       @AuthenticationPrincipal UUID callerId) {
        return workspaceService.getMembers(workspaceId, callerId);
    }

    @PostMapping("/{workspaceId}/members")
    public ResponseEntity<WorkspaceMemberResponseDto> addMember(
            @PathVariable UUID workspaceId,
            @Valid @RequestBody AddMemberRequestDto dto,
            @AuthenticationPrincipal UUID callerId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(workspaceService.addMember(workspaceId, dto, callerId));
    }

    @PutMapping("/{workspaceId}/members/{userId}")
    public WorkspaceMemberResponseDto updateMemberRole(
            @PathVariable UUID workspaceId,
            @PathVariable UUID userId,
            @Valid @RequestBody UpdateMemberRoleRequestDto dto,
            @AuthenticationPrincipal UUID callerId) {
        return workspaceService.updateMemberRole(workspaceId, userId, dto, callerId);
    }

    @DeleteMapping("/{workspaceId}/members/{userId}")
    public ResponseEntity<Void> removeMember(@PathVariable UUID workspaceId,
                                             @PathVariable UUID userId,
                                             @AuthenticationPrincipal UUID callerId) {
        workspaceService.removeMember(workspaceId, userId, callerId);
        return ResponseEntity.noContent().build();
    }
}