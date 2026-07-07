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
            @PathVariable("workspaceId") UUID workspaceId,
            @Valid @RequestBody CreateProjectRequestDto dto,
            @AuthenticationPrincipal UUID callerId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(projectService.create(workspaceId, dto, callerId));
    }

    @GetMapping("/workspaces/{workspaceId}/projects")
    public List<ProjectResponseDto> listByWorkspace(@PathVariable("workspaceId") UUID workspaceId,
                                                    @AuthenticationPrincipal UUID callerId) {
        return projectService.findByWorkspace(workspaceId, callerId);
    }

    @GetMapping("/projects/{projectId}")
    public ProjectResponseDto getById(@PathVariable("projectId") UUID projectId,
                                      @AuthenticationPrincipal UUID callerId) {
        return projectService.findById(projectId, callerId);
    }

    @PutMapping("/projects/{projectId}")
    public ProjectResponseDto update(@PathVariable("projectId") UUID projectId,
                                     @Valid @RequestBody UpdateProjectRequestDto dto,
                                     @AuthenticationPrincipal UUID callerId) {
        return projectService.update(projectId, dto, callerId);
    }

    @DeleteMapping("/projects/{projectId}")
    public ResponseEntity<Void> delete(@PathVariable("projectId") UUID projectId,
                                       @AuthenticationPrincipal UUID callerId) {
        projectService.delete(projectId, callerId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/projects/{projectId}/team-members")
    public List<TeamMemberResponseDto> getTeamMembers(@PathVariable("projectId") UUID projectId,
                                                       @AuthenticationPrincipal UUID callerId) {
        return projectService.getTeamMembers(projectId, callerId);
    }
}