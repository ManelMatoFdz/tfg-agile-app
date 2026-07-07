package com.tfg.agile.app.project_service.controller;

import com.tfg.agile.app.project_service.dto.CreateProjectRequestDto;
import com.tfg.agile.app.project_service.dto.ProjectResponseDto;
import com.tfg.agile.app.project_service.dto.TeamMemberResponseDto;
import com.tfg.agile.app.project_service.dto.UpdateProjectRequestDto;
import com.tfg.agile.app.project_service.entity.ProjectVisibility;
import com.tfg.agile.app.project_service.entity.TeamRole;
import com.tfg.agile.app.project_service.service.ProjectService;
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
class ProjectControllerTest {

    @Mock
    private ProjectService projectService;

    @Test
    void endpoints_delegateToProjectService() {
        ProjectController controller = new ProjectController(projectService);
        UUID workspaceId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        UUID teamId = UUID.randomUUID();
        UUID callerId = UUID.randomUUID();
        UUID targetUserId = UUID.randomUUID();

        CreateProjectRequestDto createRequest = new CreateProjectRequestDto("Project", "Desc", null, teamId, null, "private");
        UpdateProjectRequestDto updateRequest = new UpdateProjectRequestDto("Project 2", "Desc 2", null, teamId, null, "private");

        ProjectResponseDto projectResponse = new ProjectResponseDto(projectId, workspaceId, null, null, "Project", "Desc", null, ProjectVisibility.PRIVATE, Instant.now(), Instant.now());
        TeamMemberResponseDto memberResponse = new TeamMemberResponseDto(UUID.randomUUID(), targetUserId, TeamRole.MEMBER, null, Instant.now(), null);

        when(projectService.create(workspaceId, createRequest, callerId)).thenReturn(projectResponse);
        when(projectService.findByWorkspace(workspaceId, callerId)).thenReturn(List.of(projectResponse));
        when(projectService.findById(projectId, callerId)).thenReturn(projectResponse);
        when(projectService.update(projectId, updateRequest, callerId)).thenReturn(projectResponse);
        when(projectService.getTeamMembers(projectId, callerId)).thenReturn(List.of(memberResponse));

        assertThat(controller.create(workspaceId, createRequest, callerId).getStatusCode().value()).isEqualTo(201);
        assertThat(controller.listByWorkspace(workspaceId, callerId)).hasSize(1);
        assertThat(controller.getById(projectId, callerId)).isEqualTo(projectResponse);
        assertThat(controller.update(projectId, updateRequest, callerId)).isEqualTo(projectResponse);
        assertThat(controller.delete(projectId, callerId).getStatusCode().value()).isEqualTo(204);
        assertThat(controller.getTeamMembers(projectId, callerId)).hasSize(1);

        verify(projectService).delete(projectId, callerId);
    }
}