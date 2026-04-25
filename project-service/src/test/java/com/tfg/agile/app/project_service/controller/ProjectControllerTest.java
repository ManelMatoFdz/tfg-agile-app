package com.tfg.agile.app.project_service.controller;

import com.tfg.agile.app.project_service.dto.AddMemberRequestDto;
import com.tfg.agile.app.project_service.dto.AddTeamMembersRequestDto;
import com.tfg.agile.app.project_service.dto.CreateProjectRequestDto;
import com.tfg.agile.app.project_service.dto.ProjectMemberResponseDto;
import com.tfg.agile.app.project_service.dto.ProjectResponseDto;
import com.tfg.agile.app.project_service.dto.UpdateMemberRoleRequestDto;
import com.tfg.agile.app.project_service.dto.UpdateProjectRequestDto;
import com.tfg.agile.app.project_service.dto.UpdateScrumRoleRequestDto;
import com.tfg.agile.app.project_service.entity.ProjectRole;
import com.tfg.agile.app.project_service.entity.ScrumRole;
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

        CreateProjectRequestDto createRequest = new CreateProjectRequestDto("Project", "Desc", null);
        UpdateProjectRequestDto updateRequest = new UpdateProjectRequestDto("Project 2", "Desc 2", null);
        AddMemberRequestDto addMemberRequest = new AddMemberRequestDto(targetUserId, "member");
        UpdateMemberRoleRequestDto updateRoleRequest = new UpdateMemberRoleRequestDto("viewer");
        UpdateScrumRoleRequestDto updateScrumRoleRequest = new UpdateScrumRoleRequestDto("product_owner");
        AddTeamMembersRequestDto addTeamMembersRequest = new AddTeamMembersRequestDto(List.of(targetUserId));

        ProjectResponseDto projectResponse = new ProjectResponseDto(projectId, workspaceId, null, "Project", "Desc", Instant.now(), Instant.now());
        ProjectMemberResponseDto memberResponse = new ProjectMemberResponseDto(UUID.randomUUID(), targetUserId, ProjectRole.MEMBER, ScrumRole.PRODUCT_OWNER, Instant.now());

        when(projectService.create(workspaceId, createRequest, callerId)).thenReturn(projectResponse);
        when(projectService.findByWorkspace(workspaceId, callerId)).thenReturn(List.of(projectResponse));
        when(projectService.findById(projectId, callerId)).thenReturn(projectResponse);
        when(projectService.update(projectId, updateRequest, callerId)).thenReturn(projectResponse);
        when(projectService.getMembers(projectId, callerId)).thenReturn(List.of(memberResponse));
        when(projectService.addMember(projectId, addMemberRequest, callerId)).thenReturn(memberResponse);
        when(projectService.updateMemberRole(projectId, targetUserId, updateRoleRequest, callerId)).thenReturn(memberResponse);
        when(projectService.updateScrumRole(projectId, targetUserId, updateScrumRoleRequest, callerId)).thenReturn(memberResponse);
        when(projectService.addMembersFromTeam(projectId, teamId, addTeamMembersRequest, callerId)).thenReturn(List.of(memberResponse));

        assertThat(controller.create(workspaceId, createRequest, callerId).getStatusCode().value()).isEqualTo(201);
        assertThat(controller.listByWorkspace(workspaceId, callerId)).hasSize(1);
        assertThat(controller.getById(projectId, callerId)).isEqualTo(projectResponse);
        assertThat(controller.update(projectId, updateRequest, callerId)).isEqualTo(projectResponse);
        assertThat(controller.delete(projectId, callerId).getStatusCode().value()).isEqualTo(204);
        assertThat(controller.getMembers(projectId, callerId)).hasSize(1);
        assertThat(controller.addMember(projectId, addMemberRequest, callerId).getStatusCode().value()).isEqualTo(201);
        assertThat(controller.updateMemberRole(projectId, targetUserId, updateRoleRequest, callerId)).isEqualTo(memberResponse);
        assertThat(controller.updateScrumRole(projectId, targetUserId, updateScrumRoleRequest, callerId)).isEqualTo(memberResponse);
        assertThat(controller.removeMember(projectId, targetUserId, callerId).getStatusCode().value()).isEqualTo(204);
        assertThat(controller.addMembersFromTeam(projectId, teamId, addTeamMembersRequest, callerId).getStatusCode().value()).isEqualTo(201);

        verify(projectService).delete(projectId, callerId);
        verify(projectService).removeMember(projectId, targetUserId, callerId);
    }
}

