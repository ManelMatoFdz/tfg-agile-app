package com.tfg.agile.app.project_service.controller;

import com.tfg.agile.app.project_service.dto.*;
import com.tfg.agile.app.project_service.service.TeamService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
public class TeamController {

    private final TeamService teamService;

    public TeamController(TeamService teamService) {
        this.teamService = teamService;
    }

    @PostMapping("/workspaces/{workspaceId}/teams")
    public ResponseEntity<TeamResponseDto> create(
            @PathVariable UUID workspaceId,
            @Valid @RequestBody CreateTeamRequestDto dto,
            @AuthenticationPrincipal UUID callerId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(teamService.create(workspaceId, dto, callerId));
    }

    @GetMapping("/workspaces/{workspaceId}/teams")
    public List<TeamResponseDto> listByWorkspace(@PathVariable UUID workspaceId,
                                                 @AuthenticationPrincipal UUID callerId) {
        return teamService.findByWorkspace(workspaceId, callerId);
    }

    @GetMapping("/teams/{teamId}")
    public TeamResponseDto getById(@PathVariable UUID teamId,
                                   @AuthenticationPrincipal UUID callerId) {
        return teamService.findById(teamId, callerId);
    }

    @PutMapping("/teams/{teamId}")
    public TeamResponseDto update(@PathVariable UUID teamId,
                                  @Valid @RequestBody UpdateTeamRequestDto dto,
                                  @AuthenticationPrincipal UUID callerId) {
        return teamService.update(teamId, dto, callerId);
    }

    @DeleteMapping("/teams/{teamId}")
    public ResponseEntity<Void> delete(@PathVariable UUID teamId,
                                       @AuthenticationPrincipal UUID callerId) {
        teamService.delete(teamId, callerId);
        return ResponseEntity.noContent().build();
    }

    // ── members ──────────────────────────────────────────────────────────────

    @GetMapping("/teams/{teamId}/members")
    public List<TeamMemberResponseDto> getMembers(@PathVariable UUID teamId,
                                                  @AuthenticationPrincipal UUID callerId) {
        return teamService.getMembers(teamId, callerId);
    }

    @PostMapping("/teams/{teamId}/members/{userId}")
    public ResponseEntity<TeamMemberResponseDto> addMember(
            @PathVariable UUID teamId,
            @PathVariable UUID userId,
            @AuthenticationPrincipal UUID callerId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(teamService.addMember(teamId, userId, callerId));
    }

    @DeleteMapping("/teams/{teamId}/members/{userId}")
    public ResponseEntity<Void> removeMember(@PathVariable UUID teamId,
                                             @PathVariable UUID userId,
                                             @AuthenticationPrincipal UUID callerId) {
        teamService.removeMember(teamId, userId, callerId);
        return ResponseEntity.noContent().build();
    }
}