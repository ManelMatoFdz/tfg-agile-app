package com.tfg.agile.app.project_service.controller;

import com.tfg.agile.app.project_service.dto.CreateTeamRequestDto;
import com.tfg.agile.app.project_service.dto.TeamMemberResponseDto;
import com.tfg.agile.app.project_service.dto.TeamResponseDto;
import com.tfg.agile.app.project_service.dto.UpdateScrumRoleRequestDto;
import com.tfg.agile.app.project_service.dto.UpdateTeamMemberRoleRequestDto;
import com.tfg.agile.app.project_service.dto.UpdateTeamRequestDto;
import com.tfg.agile.app.project_service.entity.ScrumRole;
import com.tfg.agile.app.project_service.entity.TeamRole;
import com.tfg.agile.app.project_service.service.TeamService;
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
class TeamControllerTest {

    @Mock
    private TeamService teamService;

    @Test
    void endpoints_delegateToTeamService() {
        TeamController controller = new TeamController(teamService);
        UUID workspaceId = UUID.randomUUID();
        UUID teamId = UUID.randomUUID();
        UUID callerId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        CreateTeamRequestDto createRequest = new CreateTeamRequestDto("Team", "Desc", null);
        UpdateTeamRequestDto updateRequest = new UpdateTeamRequestDto("Team 2", "Desc 2", null);
        TeamResponseDto teamResponse = new TeamResponseDto(teamId, workspaceId, "Team", "Desc", "#6366f1", Instant.now(), Instant.now());
        TeamMemberResponseDto memberResponse = new TeamMemberResponseDto(UUID.randomUUID(), userId, TeamRole.MEMBER, null, Instant.now(), null);

        when(teamService.create(workspaceId, createRequest, callerId)).thenReturn(teamResponse);
        when(teamService.findByWorkspace(workspaceId, callerId)).thenReturn(List.of(teamResponse));
        when(teamService.findById(teamId, callerId)).thenReturn(teamResponse);
        when(teamService.update(teamId, updateRequest, callerId)).thenReturn(teamResponse);
        when(teamService.getMembers(teamId, callerId)).thenReturn(List.of(memberResponse));
        when(teamService.addMember(teamId, userId, callerId)).thenReturn(memberResponse);

        assertThat(controller.create(workspaceId, createRequest, callerId).getStatusCode().value()).isEqualTo(201);
        assertThat(controller.listByWorkspace(workspaceId, callerId)).hasSize(1);
        assertThat(controller.getById(teamId, callerId)).isEqualTo(teamResponse);
        assertThat(controller.update(teamId, updateRequest, callerId)).isEqualTo(teamResponse);
        assertThat(controller.delete(teamId, callerId).getStatusCode().value()).isEqualTo(204);
        assertThat(controller.getMembers(teamId, callerId)).hasSize(1);
        assertThat(controller.addMember(teamId, userId, callerId).getStatusCode().value()).isEqualTo(201);
        assertThat(controller.removeMember(teamId, userId, callerId).getStatusCode().value()).isEqualTo(204);

        verify(teamService).delete(teamId, callerId);
        verify(teamService).removeMember(teamId, userId, callerId);
    }

    @Test
    void leaveTeam_delegatesToService() {
        TeamController controller = new TeamController(teamService);
        UUID teamId = UUID.randomUUID();
        UUID callerId = UUID.randomUUID();

        var response = controller.leaveTeam(teamId, callerId);

        assertThat(response.getStatusCode().value()).isEqualTo(204);
        verify(teamService).leaveTeam(teamId, callerId);
    }

    @Test
    void updateMemberRole_delegatesToService() {
        TeamController controller = new TeamController(teamService);
        UUID teamId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID callerId = UUID.randomUUID();
        UpdateTeamMemberRoleRequestDto dto = new UpdateTeamMemberRoleRequestDto(TeamRole.ADMIN);
        TeamMemberResponseDto memberResponse = new TeamMemberResponseDto(UUID.randomUUID(), userId, TeamRole.ADMIN, null, Instant.now(), null);

        when(teamService.updateMemberRole(teamId, userId, dto, callerId)).thenReturn(memberResponse);

        var result = controller.updateMemberRole(teamId, userId, dto, callerId);

        assertThat(result).isEqualTo(memberResponse);
        assertThat(result.role()).isEqualTo(TeamRole.ADMIN);
    }

    @Test
    void updateScrumRole_delegatesToService() {
        TeamController controller = new TeamController(teamService);
        UUID teamId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID callerId = UUID.randomUUID();
        UpdateScrumRoleRequestDto dto = new UpdateScrumRoleRequestDto("SCRUM_MASTER");
        TeamMemberResponseDto memberResponse = new TeamMemberResponseDto(UUID.randomUUID(), userId, TeamRole.MEMBER, ScrumRole.SCRUM_MASTER, Instant.now(), null);

        when(teamService.updateScrumRole(teamId, userId, dto, callerId)).thenReturn(memberResponse);

        var result = controller.updateScrumRole(teamId, userId, dto, callerId);

        assertThat(result).isEqualTo(memberResponse);
        assertThat(result.scrumRole()).isEqualTo(ScrumRole.SCRUM_MASTER);
    }
}
