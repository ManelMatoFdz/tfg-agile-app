package com.tfg.agile.app.project_service.controller;

import com.tfg.agile.app.project_service.dto.MemberPermissionsDto;
import com.tfg.agile.app.project_service.dto.ProjectMemberIdsDto;
import com.tfg.agile.app.project_service.service.ProjectService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/internal/projects")
public class InternalProjectController {

    private final ProjectService projectService;

    public InternalProjectController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @GetMapping("/{projectId}/members/{userId}/permissions")
    public MemberPermissionsDto getMemberPermissions(
            @PathVariable("projectId") UUID projectId,
            @PathVariable("userId") UUID userId) {
        return projectService.getMemberPermissions(projectId, userId);
    }

    @PostMapping("/{projectId}/touch")
    public ResponseEntity<Void> touchProject(@PathVariable("projectId") UUID projectId) {
        projectService.touchUpdatedAt(projectId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{projectId}/member-ids")
    public ProjectMemberIdsDto getMemberIds(@PathVariable("projectId") UUID projectId) {
        return projectService.getMemberIds(projectId);
    }

    @PostMapping("/{projectId}/members/{userId}/touch")
    public ResponseEntity<Void> touchMemberActivity(
            @PathVariable("projectId") UUID projectId,
            @PathVariable("userId") UUID userId) {
        projectService.touchMemberActivity(projectId, userId);
        return ResponseEntity.noContent().build();
    }
}