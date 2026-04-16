package com.tfg.agile.app.project_service.controller;

import com.tfg.agile.app.project_service.dto.*;
import com.tfg.agile.app.project_service.service.ProjectService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
public class ProjectController {

    private final ProjectService projectService;

    public ProjectController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @PostMapping("/workspaces/{workspaceId}/projects")
    public ResponseEntity<ProjectResponseDto> create(
            @PathVariable UUID workspaceId,
            @Valid @RequestBody CreateProjectRequestDto dto,
            @AuthenticationPrincipal UUID callerId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(projectService.create(workspaceId, dto, callerId));
    }

    @GetMapping("/workspaces/{workspaceId}/projects")
    public List<ProjectResponseDto> listByWorkspace(@PathVariable UUID workspaceId,
                                                    @AuthenticationPrincipal UUID callerId) {
        return projectService.findByWorkspace(workspaceId, callerId);
    }

    @GetMapping("/projects/{projectId}")
    public ProjectResponseDto getById(@PathVariable UUID projectId,
                                      @AuthenticationPrincipal UUID callerId) {
        return projectService.findById(projectId, callerId);
    }

    @PutMapping("/projects/{projectId}")
    public ProjectResponseDto update(@PathVariable UUID projectId,
                                     @Valid @RequestBody UpdateProjectRequestDto dto,
                                     @AuthenticationPrincipal UUID callerId) {
        return projectService.update(projectId, dto, callerId);
    }

    @DeleteMapping("/projects/{projectId}")
    public ResponseEntity<Void> delete(@PathVariable UUID projectId,
                                       @AuthenticationPrincipal UUID callerId) {
        projectService.delete(projectId, callerId);
        return ResponseEntity.noContent().build();
    }

    // ── members ──────────────────────────────────────────────────────────────

    @GetMapping("/projects/{projectId}/members")
    public List<ProjectMemberResponseDto> getMembers(@PathVariable UUID projectId,
                                                     @AuthenticationPrincipal UUID callerId) {
        return projectService.getMembers(projectId, callerId);
    }

    @PostMapping("/projects/{projectId}/members")
    public ResponseEntity<ProjectMemberResponseDto> addMember(
            @PathVariable UUID projectId,
            @Valid @RequestBody AddMemberRequestDto dto,
            @AuthenticationPrincipal UUID callerId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(projectService.addMember(projectId, dto, callerId));
    }

    @PutMapping("/projects/{projectId}/members/{userId}")
    public ProjectMemberResponseDto updateMemberRole(
            @PathVariable UUID projectId,
            @PathVariable UUID userId,
            @Valid @RequestBody UpdateMemberRoleRequestDto dto,
            @AuthenticationPrincipal UUID callerId) {
        return projectService.updateMemberRole(projectId, userId, dto, callerId);
    }

    @DeleteMapping("/projects/{projectId}/members/{userId}")
    public ResponseEntity<Void> removeMember(@PathVariable UUID projectId,
                                             @PathVariable UUID userId,
                                             @AuthenticationPrincipal UUID callerId) {
        projectService.removeMember(projectId, userId, callerId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/projects/{projectId}/members/from-team/{teamId}")
    public ResponseEntity<List<ProjectMemberResponseDto>> addMembersFromTeam(
            @PathVariable UUID projectId,
            @PathVariable UUID teamId,
            @RequestBody(required = false) AddTeamMembersRequestDto dto,
            @AuthenticationPrincipal UUID callerId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(projectService.addMembersFromTeam(projectId, teamId, dto, callerId));
    }
}