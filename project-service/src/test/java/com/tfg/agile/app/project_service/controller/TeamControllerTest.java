package com.tfg.agile.app.project_service.controller;

import com.tfg.agile.app.project_service.dto.CreateTeamRequestDto;
import com.tfg.agile.app.project_service.dto.TeamMemberResponseDto;
import com.tfg.agile.app.project_service.dto.TeamResponseDto;
import com.tfg.agile.app.project_service.dto.UpdateTeamRequestDto;
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

        CreateTeamRequestDto createRequest = new CreateTeamRequestDto("Team", "Desc");
        UpdateTeamRequestDto updateRequest = new UpdateTeamRequestDto("Team 2", "Desc 2");
        TeamResponseDto teamResponse = new TeamResponseDto(teamId, workspaceId, "Team", "Desc", Instant.now(), Instant.now());
        TeamMemberResponseDto memberResponse = new TeamMemberResponseDto(UUID.randomUUID(), userId, Instant.now());

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
}

