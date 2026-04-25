package com.tfg.agile.app.project_service.controller;

import com.tfg.agile.app.project_service.dto.MemberPermissionsDto;
import com.tfg.agile.app.project_service.service.ProjectService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
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
            @PathVariable UUID projectId,
            @PathVariable UUID userId) {
        return projectService.getMemberPermissions(projectId, userId);
    }
}