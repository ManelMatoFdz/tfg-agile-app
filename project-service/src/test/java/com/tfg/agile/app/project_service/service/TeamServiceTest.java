package com.tfg.agile.app.project_service.service;

import com.tfg.agile.app.project_service.dto.CreateTeamRequestDto;
import com.tfg.agile.app.project_service.dto.UpdateTeamRequestDto;
import com.tfg.agile.app.project_service.entity.Team;
import com.tfg.agile.app.project_service.entity.TeamMember;
import com.tfg.agile.app.project_service.entity.Workspace;
import com.tfg.agile.app.project_service.entity.WorkspaceRole;
import com.tfg.agile.app.project_service.exception.ConflictException;
import com.tfg.agile.app.project_service.exception.ForbiddenException;
import com.tfg.agile.app.project_service.exception.ResourceNotFoundException;
import com.tfg.agile.app.project_service.repository.TeamMemberRepository;
import com.tfg.agile.app.project_service.repository.TeamRepository;
import com.tfg.agile.app.project_service.repository.WorkspaceMemberRepository;
import com.tfg.agile.app.project_service.repository.WorkspaceRepository;
import com.tfg.agile.app.project_service.support.TestDataFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TeamServiceTest {

    @Mock
    private TeamRepository teamRepository;
    @Mock
    private TeamMemberRepository teamMemberRepository;
    @Mock
    private WorkspaceRepository workspaceRepository;
    @Mock
    private WorkspaceMemberRepository workspaceMemberRepository;

    private TeamService service;

    @BeforeEach
    void setUp() {
        service = new TeamService(teamRepository, teamMemberRepository, workspaceRepository, workspaceMemberRepository);
    }

    @Test
    void create_persistsTeamForWorkspaceMember() {
        UUID callerId = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        Team team = TestDataFactory.team(workspace);

        when(workspaceRepository.findById(workspace.getId())).thenReturn(Optional.of(workspace));
        when(workspaceMemberRepository.existsByWorkspaceIdAndUserId(workspace.getId(), callerId)).thenReturn(true);
        when(teamRepository.save(any(Team.class))).thenReturn(team);

        var response = service.create(workspace.getId(), new CreateTeamRequestDto("Team", "Desc"), callerId);

        assertThat(response.id()).isEqualTo(team.getId());
    }

    @Test
    void update_requiresWorkspaceAdmin() {
        UUID callerId = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        Team team = TestDataFactory.team(workspace);

        when(teamRepository.findById(team.getId())).thenReturn(Optional.of(team));
        when(workspaceMemberRepository.existsByWorkspaceIdAndUserIdAndRole(workspace.getId(), callerId, WorkspaceRole.ADMIN)).thenReturn(false);

        assertThatThrownBy(() -> service.update(team.getId(), new UpdateTeamRequestDto("Team", "Desc"), callerId))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void addMember_throwsConflictWhenAlreadyPresent() {
        UUID callerId = UUID.randomUUID();
        UUID targetUser = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        Team team = TestDataFactory.team(workspace);

        when(teamRepository.findById(team.getId())).thenReturn(Optional.of(team));
        when(workspaceMemberRepository.existsByWorkspaceIdAndUserIdAndRole(workspace.getId(), callerId, WorkspaceRole.ADMIN)).thenReturn(true);
        when(teamMemberRepository.existsByTeamIdAndUserId(team.getId(), targetUser)).thenReturn(true);

        assertThatThrownBy(() -> service.addMember(team.getId(), targetUser, callerId))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void removeMember_throwsWhenTargetMemberDoesNotExist() {
        UUID callerId = UUID.randomUUID();
        UUID targetUser = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        Team team = TestDataFactory.team(workspace);

        when(teamRepository.findById(team.getId())).thenReturn(Optional.of(team));
        when(workspaceMemberRepository.existsByWorkspaceIdAndUserIdAndRole(workspace.getId(), callerId, WorkspaceRole.ADMIN)).thenReturn(true);
        when(teamMemberRepository.findByTeamIdAndUserId(team.getId(), targetUser)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.removeMember(team.getId(), targetUser, callerId))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void getMembers_returnsTeamMembersForWorkspaceMember() {
        UUID callerId = UUID.randomUUID();
        UUID targetUser = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        Team team = TestDataFactory.team(workspace);
        TeamMember member = TestDataFactory.teamMember(team, targetUser);

        when(teamRepository.findById(team.getId())).thenReturn(Optional.of(team));
        when(workspaceMemberRepository.existsByWorkspaceIdAndUserId(workspace.getId(), callerId)).thenReturn(true);
        when(teamMemberRepository.findByTeamId(team.getId())).thenReturn(List.of(member));

        var result = service.getMembers(team.getId(), callerId);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).userId()).isEqualTo(targetUser);
        verify(teamMemberRepository).findByTeamId(team.getId());
    }

    @Test
    void findByWorkspace_returnsWorkspaceTeams() {
        UUID callerId = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        Team team = TestDataFactory.team(workspace);

        when(workspaceRepository.findById(workspace.getId())).thenReturn(Optional.of(workspace));
        when(workspaceMemberRepository.existsByWorkspaceIdAndUserId(workspace.getId(), callerId)).thenReturn(true);
        when(teamRepository.findByWorkspaceId(workspace.getId())).thenReturn(List.of(team));

        var result = service.findByWorkspace(workspace.getId(), callerId);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).id()).isEqualTo(team.getId());
    }

    @Test
    void findByWorkspace_throwsWhenWorkspaceMissing() {
        UUID workspaceId = UUID.randomUUID();

        when(workspaceRepository.findById(workspaceId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.findByWorkspace(workspaceId, UUID.randomUUID()))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void findById_returnsTeamForWorkspaceMember() {
        UUID callerId = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        Team team = TestDataFactory.team(workspace);

        when(teamRepository.findById(team.getId())).thenReturn(Optional.of(team));
        when(workspaceMemberRepository.existsByWorkspaceIdAndUserId(workspace.getId(), callerId)).thenReturn(true);

        var response = service.findById(team.getId(), callerId);

        assertThat(response.id()).isEqualTo(team.getId());
    }

    @Test
    void update_savesModifiedTeam() {
        UUID callerId = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        Team team = TestDataFactory.team(workspace);

        when(teamRepository.findById(team.getId())).thenReturn(Optional.of(team));
        when(workspaceMemberRepository.existsByWorkspaceIdAndUserIdAndRole(workspace.getId(), callerId, WorkspaceRole.ADMIN)).thenReturn(true);
        when(teamRepository.save(team)).thenReturn(team);

        var response = service.update(team.getId(), new UpdateTeamRequestDto("Updated", "Desc"), callerId);

        assertThat(response.name()).isEqualTo("Updated");
    }

    @Test
    void delete_removesTeamForWorkspaceAdmin() {
        UUID callerId = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        Team team = TestDataFactory.team(workspace);

        when(teamRepository.findById(team.getId())).thenReturn(Optional.of(team));
        when(workspaceMemberRepository.existsByWorkspaceIdAndUserIdAndRole(workspace.getId(), callerId, WorkspaceRole.ADMIN)).thenReturn(true);

        service.delete(team.getId(), callerId);

        verify(teamRepository).deleteById(team.getId());
    }

    @Test
    void addMember_createsTeamMember() {
        UUID callerId = UUID.randomUUID();
        UUID targetUser = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        Team team = TestDataFactory.team(workspace);
        TeamMember saved = TestDataFactory.teamMember(team, targetUser);

        when(teamRepository.findById(team.getId())).thenReturn(Optional.of(team));
        when(workspaceMemberRepository.existsByWorkspaceIdAndUserIdAndRole(workspace.getId(), callerId, WorkspaceRole.ADMIN)).thenReturn(true);
        when(teamMemberRepository.existsByTeamIdAndUserId(team.getId(), targetUser)).thenReturn(false);
        when(teamMemberRepository.save(any(TeamMember.class))).thenReturn(saved);

        var response = service.addMember(team.getId(), targetUser, callerId);

        assertThat(response.userId()).isEqualTo(targetUser);
    }

    @Test
    void removeMember_deletesExistingMember() {
        UUID callerId = UUID.randomUUID();
        UUID targetUser = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        Team team = TestDataFactory.team(workspace);
        TeamMember member = TestDataFactory.teamMember(team, targetUser);

        when(teamRepository.findById(team.getId())).thenReturn(Optional.of(team));
        when(workspaceMemberRepository.existsByWorkspaceIdAndUserIdAndRole(workspace.getId(), callerId, WorkspaceRole.ADMIN)).thenReturn(true);
        when(teamMemberRepository.findByTeamIdAndUserId(team.getId(), targetUser)).thenReturn(Optional.of(member));

        service.removeMember(team.getId(), targetUser, callerId);

        verify(teamMemberRepository).delete(member);
    }
}
