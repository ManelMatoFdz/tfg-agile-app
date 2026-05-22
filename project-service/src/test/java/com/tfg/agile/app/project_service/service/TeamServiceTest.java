package com.tfg.agile.app.project_service.service;

import com.tfg.agile.app.project_service.dto.CreateTeamRequestDto;
import com.tfg.agile.app.project_service.dto.UpdateTeamMemberRoleRequestDto;
import com.tfg.agile.app.project_service.dto.UpdateTeamRequestDto;
import com.tfg.agile.app.project_service.entity.Team;
import com.tfg.agile.app.project_service.entity.TeamMember;
import com.tfg.agile.app.project_service.entity.TeamRole;
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

    @Mock private TeamRepository teamRepository;
    @Mock private TeamMemberRepository teamMemberRepository;
    @Mock private WorkspaceRepository workspaceRepository;
    @Mock private WorkspaceMemberRepository workspaceMemberRepository;

    private TeamService service;

    @BeforeEach
    void setUp() {
        service = new TeamService(teamRepository, teamMemberRepository, workspaceRepository, workspaceMemberRepository);
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private void mockWorkspaceAdmin(UUID workspaceId, UUID userId, boolean isAdmin) {
        when(workspaceMemberRepository.existsByWorkspaceIdAndUserIdAndRole(workspaceId, userId, WorkspaceRole.ADMIN))
                .thenReturn(isAdmin);
    }

    private void mockTeamMemberRole(Team team, UUID userId, TeamRole role) {
        TeamMember m = TestDataFactory.teamMember(team, userId, role);
        when(teamMemberRepository.findByTeamIdAndUserId(team.getId(), userId)).thenReturn(Optional.of(m));
    }

    private void mockNotTeamMember(UUID teamId, UUID userId) {
        when(teamMemberRepository.findByTeamIdAndUserId(teamId, userId)).thenReturn(Optional.empty());
    }

    // ── create ───────────────────────────────────────────────────────────────

    @Test
    void create_persistsTeamForWorkspaceMember() {
        UUID callerId = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        Team team = TestDataFactory.team(workspace);

        when(workspaceRepository.findById(workspace.getId())).thenReturn(Optional.of(workspace));
        when(workspaceMemberRepository.existsByWorkspaceIdAndUserId(workspace.getId(), callerId)).thenReturn(true);
        when(teamRepository.save(any(Team.class))).thenAnswer(inv -> {
            Team saved = inv.getArgument(0);
            saved.setId(team.getId());
            return saved;
        });

        var response = service.create(workspace.getId(), new CreateTeamRequestDto("Team", "Desc"), callerId);

        assertThat(response.id()).isEqualTo(team.getId());
    }

    @Test
    void create_throwsWhenWorkspaceNotFound() {
        UUID workspaceId = UUID.randomUUID();
        when(workspaceRepository.findById(workspaceId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.create(workspaceId, new CreateTeamRequestDto("T", null), UUID.randomUUID()))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void create_throwsWhenCallerNotWorkspaceMember() {
        UUID callerId = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();

        when(workspaceRepository.findById(workspace.getId())).thenReturn(Optional.of(workspace));
        when(workspaceMemberRepository.existsByWorkspaceIdAndUserId(workspace.getId(), callerId)).thenReturn(false);

        assertThatThrownBy(() -> service.create(workspace.getId(), new CreateTeamRequestDto("T", null), callerId))
                .isInstanceOf(ForbiddenException.class);
    }

    // ── findByWorkspace ───────────────────────────────────────────────────────

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

    // ── findById ─────────────────────────────────────────────────────────────

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

    // ── update ───────────────────────────────────────────────────────────────

    @Test
    void update_savesModifiedTeamForWorkspaceAdmin() {
        UUID callerId = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        Team team = TestDataFactory.team(workspace);

        when(teamRepository.findById(team.getId())).thenReturn(Optional.of(team));
        mockWorkspaceAdmin(workspace.getId(), callerId, true);
        when(teamRepository.save(team)).thenReturn(team);

        var response = service.update(team.getId(), new UpdateTeamRequestDto("Updated", "Desc"), callerId);

        assertThat(response.name()).isEqualTo("Updated");
    }

    @Test
    void update_savesModifiedTeamForTeamAdmin() {
        UUID callerId = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        Team team = TestDataFactory.team(workspace);

        when(teamRepository.findById(team.getId())).thenReturn(Optional.of(team));
        mockTeamMemberRole(team, callerId, TeamRole.ADMIN);
        when(teamRepository.save(team)).thenReturn(team);

        var response = service.update(team.getId(), new UpdateTeamRequestDto("Updated", "Desc"), callerId);

        assertThat(response.name()).isEqualTo("Updated");
    }

    @Test
    void update_throwsWhenPlainTeamMember() {
        UUID callerId = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        Team team = TestDataFactory.team(workspace);

        when(teamRepository.findById(team.getId())).thenReturn(Optional.of(team));
        mockTeamMemberRole(team, callerId, TeamRole.MEMBER);
        mockWorkspaceAdmin(workspace.getId(), callerId, false);

        assertThatThrownBy(() -> service.update(team.getId(), new UpdateTeamRequestDto("X", null), callerId))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void update_throwsWhenNeitherTeamAdminNorWorkspaceAdmin() {
        UUID callerId = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        Team team = TestDataFactory.team(workspace);

        when(teamRepository.findById(team.getId())).thenReturn(Optional.of(team));
        mockNotTeamMember(team.getId(), callerId);
        mockWorkspaceAdmin(workspace.getId(), callerId, false);

        assertThatThrownBy(() -> service.update(team.getId(), new UpdateTeamRequestDto("X", null), callerId))
                .isInstanceOf(ForbiddenException.class);
    }

    // ── delete ───────────────────────────────────────────────────────────────

    @Test
    void delete_removesTeamForWorkspaceAdmin() {
        UUID callerId = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        Team team = TestDataFactory.team(workspace);

        when(teamRepository.findById(team.getId())).thenReturn(Optional.of(team));
        mockWorkspaceAdmin(workspace.getId(), callerId, true);

        service.delete(team.getId(), callerId);

        verify(teamMemberRepository).deleteByTeamId(team.getId());
        verify(teamRepository).deleteById(team.getId());
    }

    @Test
    void delete_removesTeamForTeamAdmin() {
        UUID callerId = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        Team team = TestDataFactory.team(workspace);

        when(teamRepository.findById(team.getId())).thenReturn(Optional.of(team));
        mockTeamMemberRole(team, callerId, TeamRole.ADMIN);

        service.delete(team.getId(), callerId);

        verify(teamMemberRepository).deleteByTeamId(team.getId());
        verify(teamRepository).deleteById(team.getId());
    }

    @Test
    void delete_throwsWhenPlainTeamMember() {
        UUID callerId = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        Team team = TestDataFactory.team(workspace);

        when(teamRepository.findById(team.getId())).thenReturn(Optional.of(team));
        mockTeamMemberRole(team, callerId, TeamRole.MEMBER);
        mockWorkspaceAdmin(workspace.getId(), callerId, false);

        assertThatThrownBy(() -> service.delete(team.getId(), callerId))
                .isInstanceOf(ForbiddenException.class);
    }

    // ── getMembers ────────────────────────────────────────────────────────────

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
    }

    // ── addMember ─────────────────────────────────────────────────────────────

    @Test
    void addMember_createsTeamMemberForWorkspaceAdmin() {
        UUID callerId = UUID.randomUUID();
        UUID targetUser = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        Team team = TestDataFactory.team(workspace);
        TeamMember saved = TestDataFactory.teamMember(team, targetUser);

        when(teamRepository.findById(team.getId())).thenReturn(Optional.of(team));
        mockWorkspaceAdmin(workspace.getId(), callerId, true);
        when(teamMemberRepository.existsByTeamIdAndUserId(team.getId(), targetUser)).thenReturn(false);
        when(teamMemberRepository.save(any(TeamMember.class))).thenReturn(saved);

        var response = service.addMember(team.getId(), targetUser, callerId);

        assertThat(response.userId()).isEqualTo(targetUser);
    }

    @Test
    void addMember_createsTeamMemberForTeamAdmin() {
        UUID callerId = UUID.randomUUID();
        UUID targetUser = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        Team team = TestDataFactory.team(workspace);
        TeamMember saved = TestDataFactory.teamMember(team, targetUser);

        when(teamRepository.findById(team.getId())).thenReturn(Optional.of(team));
        mockTeamMemberRole(team, callerId, TeamRole.ADMIN);
        when(teamMemberRepository.existsByTeamIdAndUserId(team.getId(), targetUser)).thenReturn(false);
        when(teamMemberRepository.save(any(TeamMember.class))).thenReturn(saved);

        var response = service.addMember(team.getId(), targetUser, callerId);

        assertThat(response.userId()).isEqualTo(targetUser);
    }

    @Test
    void addMember_throwsWhenPlainTeamMember() {
        UUID callerId = UUID.randomUUID();
        UUID targetUser = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        Team team = TestDataFactory.team(workspace);

        when(teamRepository.findById(team.getId())).thenReturn(Optional.of(team));
        mockTeamMemberRole(team, callerId, TeamRole.MEMBER);
        mockWorkspaceAdmin(workspace.getId(), callerId, false);

        assertThatThrownBy(() -> service.addMember(team.getId(), targetUser, callerId))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void addMember_throwsConflictWhenAlreadyPresent() {
        UUID callerId = UUID.randomUUID();
        UUID targetUser = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        Team team = TestDataFactory.team(workspace);

        when(teamRepository.findById(team.getId())).thenReturn(Optional.of(team));
        mockWorkspaceAdmin(workspace.getId(), callerId, true);
        when(teamMemberRepository.existsByTeamIdAndUserId(team.getId(), targetUser)).thenReturn(true);

        assertThatThrownBy(() -> service.addMember(team.getId(), targetUser, callerId))
                .isInstanceOf(ConflictException.class);
    }

    // ── removeMember ──────────────────────────────────────────────────────────

    @Test
    void removeMember_deletesExistingMemberForWorkspaceAdmin() {
        UUID callerId = UUID.randomUUID();
        UUID targetUser = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        Team team = TestDataFactory.team(workspace);
        TeamMember target = TestDataFactory.teamMember(team, targetUser);

        when(teamRepository.findById(team.getId())).thenReturn(Optional.of(team));
        mockWorkspaceAdmin(workspace.getId(), callerId, true);
        when(teamMemberRepository.findByTeamIdAndUserId(team.getId(), callerId)).thenReturn(Optional.empty());
        when(teamMemberRepository.findByTeamIdAndUserId(team.getId(), targetUser)).thenReturn(Optional.of(target));

        service.removeMember(team.getId(), targetUser, callerId);

        verify(teamMemberRepository).delete(target);
    }

    @Test
    void removeMember_deletesExistingMemberForTeamAdmin() {
        UUID callerId = UUID.randomUUID();
        UUID targetUser = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        Team team = TestDataFactory.team(workspace);
        TeamMember callerMember = TestDataFactory.teamMember(team, callerId, TeamRole.ADMIN);
        TeamMember target = TestDataFactory.teamMember(team, targetUser);

        when(teamRepository.findById(team.getId())).thenReturn(Optional.of(team));
        when(teamMemberRepository.findByTeamIdAndUserId(team.getId(), callerId)).thenReturn(Optional.of(callerMember));
        when(teamMemberRepository.findByTeamIdAndUserId(team.getId(), targetUser)).thenReturn(Optional.of(target));

        service.removeMember(team.getId(), targetUser, callerId);

        verify(teamMemberRepository).delete(target);
    }

    @Test
    void removeMember_throwsWhenPlainTeamMember() {
        UUID callerId = UUID.randomUUID();
        UUID targetUser = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        Team team = TestDataFactory.team(workspace);

        when(teamRepository.findById(team.getId())).thenReturn(Optional.of(team));
        mockTeamMemberRole(team, callerId, TeamRole.MEMBER);
        mockWorkspaceAdmin(workspace.getId(), callerId, false);

        assertThatThrownBy(() -> service.removeMember(team.getId(), targetUser, callerId))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void removeMember_throwsWhenTargetNotFound() {
        UUID callerId = UUID.randomUUID();
        UUID targetUser = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        Team team = TestDataFactory.team(workspace);

        when(teamRepository.findById(team.getId())).thenReturn(Optional.of(team));
        mockWorkspaceAdmin(workspace.getId(), callerId, true);
        when(teamMemberRepository.findByTeamIdAndUserId(team.getId(), callerId)).thenReturn(Optional.empty());
        when(teamMemberRepository.findByTeamIdAndUserId(team.getId(), targetUser)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.removeMember(team.getId(), targetUser, callerId))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ── updateMemberRole ──────────────────────────────────────────────────────

    @Test
    void updateMemberRole_promotesToAdminForWorkspaceAdmin() {
        UUID callerId = UUID.randomUUID();
        UUID targetUser = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        Team team = TestDataFactory.team(workspace);
        TeamMember target = TestDataFactory.teamMember(team, targetUser, TeamRole.MEMBER);

        when(teamRepository.findById(team.getId())).thenReturn(Optional.of(team));
        mockWorkspaceAdmin(workspace.getId(), callerId, true);
        when(teamMemberRepository.findByTeamIdAndUserId(team.getId(), callerId)).thenReturn(Optional.empty());
        when(teamMemberRepository.findByTeamIdAndUserId(team.getId(), targetUser)).thenReturn(Optional.of(target));
        when(teamMemberRepository.save(target)).thenReturn(target);

        var result = service.updateMemberRole(team.getId(), targetUser, new UpdateTeamMemberRoleRequestDto(TeamRole.ADMIN), callerId);

        assertThat(result.role()).isEqualTo(TeamRole.ADMIN);
    }

    @Test
    void updateMemberRole_promotesToAdminForTeamAdmin() {
        UUID callerId = UUID.randomUUID();
        UUID targetUser = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        Team team = TestDataFactory.team(workspace);
        TeamMember callerMember = TestDataFactory.teamMember(team, callerId, TeamRole.ADMIN);
        TeamMember target = TestDataFactory.teamMember(team, targetUser, TeamRole.MEMBER);

        when(teamRepository.findById(team.getId())).thenReturn(Optional.of(team));
        when(teamMemberRepository.findByTeamIdAndUserId(team.getId(), callerId)).thenReturn(Optional.of(callerMember));
        when(teamMemberRepository.findByTeamIdAndUserId(team.getId(), targetUser)).thenReturn(Optional.of(target));
        when(teamMemberRepository.save(target)).thenReturn(target);

        var result = service.updateMemberRole(team.getId(), targetUser, new UpdateTeamMemberRoleRequestDto(TeamRole.ADMIN), callerId);

        assertThat(result.role()).isEqualTo(TeamRole.ADMIN);
    }

    @Test
    void updateMemberRole_demotesToMemberForTeamAdmin() {
        UUID callerId = UUID.randomUUID();
        UUID targetUser = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        Team team = TestDataFactory.team(workspace);
        TeamMember callerMember = TestDataFactory.teamMember(team, callerId, TeamRole.ADMIN);
        TeamMember target = TestDataFactory.teamMember(team, targetUser, TeamRole.ADMIN);

        when(teamRepository.findById(team.getId())).thenReturn(Optional.of(team));
        when(teamMemberRepository.findByTeamIdAndUserId(team.getId(), callerId)).thenReturn(Optional.of(callerMember));
        when(teamMemberRepository.findByTeamIdAndUserId(team.getId(), targetUser)).thenReturn(Optional.of(target));
        when(teamMemberRepository.save(target)).thenReturn(target);

        var result = service.updateMemberRole(team.getId(), targetUser, new UpdateTeamMemberRoleRequestDto(TeamRole.MEMBER), callerId);

        assertThat(result.role()).isEqualTo(TeamRole.MEMBER);
    }

    @Test
    void updateMemberRole_throwsWhenPlainTeamMember() {
        UUID callerId = UUID.randomUUID();
        UUID targetUser = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        Team team = TestDataFactory.team(workspace);

        when(teamRepository.findById(team.getId())).thenReturn(Optional.of(team));
        mockTeamMemberRole(team, callerId, TeamRole.MEMBER);
        mockWorkspaceAdmin(workspace.getId(), callerId, false);

        assertThatThrownBy(() -> service.updateMemberRole(team.getId(), targetUser, new UpdateTeamMemberRoleRequestDto(TeamRole.ADMIN), callerId))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void updateMemberRole_throwsWhenTargetNotFound() {
        UUID callerId = UUID.randomUUID();
        UUID targetUser = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        Team team = TestDataFactory.team(workspace);

        when(teamRepository.findById(team.getId())).thenReturn(Optional.of(team));
        mockWorkspaceAdmin(workspace.getId(), callerId, true);
        when(teamMemberRepository.findByTeamIdAndUserId(team.getId(), callerId)).thenReturn(Optional.empty());
        when(teamMemberRepository.findByTeamIdAndUserId(team.getId(), targetUser)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.updateMemberRole(team.getId(), targetUser, new UpdateTeamMemberRoleRequestDto(TeamRole.ADMIN), callerId))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}