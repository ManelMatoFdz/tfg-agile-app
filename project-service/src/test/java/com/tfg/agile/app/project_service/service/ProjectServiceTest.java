package com.tfg.agile.app.project_service.service;

import com.tfg.agile.app.project_service.dto.CreateProjectRequestDto;
import com.tfg.agile.app.project_service.dto.MemberPermissionsDto;
import com.tfg.agile.app.project_service.dto.UpdateProjectRequestDto;
import com.tfg.agile.app.project_service.entity.Category;
import com.tfg.agile.app.project_service.entity.Project;
import com.tfg.agile.app.project_service.entity.ProjectVisibility;
import com.tfg.agile.app.project_service.entity.ScrumRole;
import com.tfg.agile.app.project_service.entity.Team;
import com.tfg.agile.app.project_service.entity.TeamMember;
import com.tfg.agile.app.project_service.entity.TeamRole;
import com.tfg.agile.app.project_service.entity.Workspace;
import com.tfg.agile.app.project_service.entity.WorkspaceRole;
import com.tfg.agile.app.project_service.exception.ForbiddenException;
import com.tfg.agile.app.project_service.exception.ResourceNotFoundException;
import com.tfg.agile.app.project_service.repository.CategoryRepository;
import com.tfg.agile.app.project_service.repository.ProjectRepository;
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
class ProjectServiceTest {

    @Mock
    private ProjectRepository projectRepository;
    @Mock
    private WorkspaceRepository workspaceRepository;
    @Mock
    private WorkspaceMemberRepository workspaceMemberRepository;
    @Mock
    private TeamRepository teamRepository;
    @Mock
    private TeamMemberRepository teamMemberRepository;
    @Mock
    private CategoryRepository categoryRepository;

    private ProjectService service;

    @BeforeEach
    void setUp() {
        service = new ProjectService(
                projectRepository,
                workspaceRepository,
                workspaceMemberRepository,
                teamRepository,
                teamMemberRepository,
                categoryRepository
        );
    }

    @Test
    void create_persistsProject() {
        UUID callerId = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        Category category = TestDataFactory.category(workspace);
        Team team = TestDataFactory.team(workspace);
        Project project = TestDataFactory.project(workspace, category);
        project.setTeam(team);

        when(workspaceRepository.findById(workspace.getId())).thenReturn(Optional.of(workspace));
        when(workspaceMemberRepository.existsByWorkspaceIdAndUserId(workspace.getId(), callerId)).thenReturn(true);
        when(categoryRepository.findById(category.getId())).thenReturn(Optional.of(category));
        when(teamRepository.findById(team.getId())).thenReturn(Optional.of(team));
        when(projectRepository.save(any(Project.class))).thenReturn(project);

        var response = service.create(workspace.getId(),
                new CreateProjectRequestDto("API", "Desc", category.getId(), team.getId(), null, "private"), callerId);

        assertThat(response.name()).isEqualTo("API");
        assertThat(response.workspaceId()).isEqualTo(workspace.getId());
        verify(projectRepository).save(any(Project.class));
    }

    @Test
    void create_throwsWhenCategoryBelongsToAnotherWorkspace() {
        UUID callerId = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        Workspace otherWorkspace = TestDataFactory.workspace();
        Category foreignCategory = TestDataFactory.category(otherWorkspace);
        Team team = TestDataFactory.team(workspace);

        when(workspaceRepository.findById(workspace.getId())).thenReturn(Optional.of(workspace));
        when(workspaceMemberRepository.existsByWorkspaceIdAndUserId(workspace.getId(), callerId)).thenReturn(true);
        when(categoryRepository.findById(foreignCategory.getId())).thenReturn(Optional.of(foreignCategory));

        assertThatThrownBy(() -> service.create(workspace.getId(),
                new CreateProjectRequestDto("API", "Desc", foreignCategory.getId(), team.getId(), null, "private"), callerId))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void findByWorkspace_returnsOnlyProjectsForCallerMembership() {
        UUID callerId = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        Project project = TestDataFactory.project(workspace, null);

        when(workspaceRepository.findById(workspace.getId())).thenReturn(Optional.of(workspace));
        when(workspaceMemberRepository.existsByWorkspaceIdAndUserId(workspace.getId(), callerId)).thenReturn(true);
        when(projectRepository.findVisibleByWorkspaceIdAndUserId(workspace.getId(), callerId, ProjectVisibility.WORKSPACE))
                .thenReturn(List.of(project));

        var result = service.findByWorkspace(workspace.getId(), callerId);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).id()).isEqualTo(project.getId());
    }

    @Test
    void findByWorkspace_throwsWhenWorkspaceDoesNotExist() {
        UUID workspaceId = UUID.randomUUID();

        when(workspaceRepository.findById(workspaceId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.findByWorkspace(workspaceId, UUID.randomUUID()))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void findByWorkspace_requiresWorkspaceMembership() {
        UUID callerId = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();

        when(workspaceRepository.findById(workspace.getId())).thenReturn(Optional.of(workspace));
        when(workspaceMemberRepository.existsByWorkspaceIdAndUserId(workspace.getId(), callerId)).thenReturn(false);

        assertThatThrownBy(() -> service.findByWorkspace(workspace.getId(), callerId))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void update_requiresAdmin() {
        UUID callerId = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        Project project = TestDataFactory.project(workspace, null);

        when(projectRepository.findById(project.getId())).thenReturn(Optional.of(project));
        // Not a workspace admin
        when(workspaceMemberRepository.existsByWorkspaceIdAndUserIdAndRole(workspace.getId(), callerId, WorkspaceRole.ADMIN)).thenReturn(false);

        assertThatThrownBy(() -> service.update(project.getId(), new UpdateProjectRequestDto("Name", "Desc", null, null, null, null), callerId))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void update_savesProjectWithResolvedCategory() {
        UUID callerId = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        Category category = TestDataFactory.category(workspace);
        Project project = TestDataFactory.project(workspace, null);

        when(projectRepository.findById(project.getId())).thenReturn(Optional.of(project));
        // Workspace admin has update rights
        when(workspaceMemberRepository.existsByWorkspaceIdAndUserIdAndRole(workspace.getId(), callerId, WorkspaceRole.ADMIN)).thenReturn(true);
        when(categoryRepository.findById(category.getId())).thenReturn(Optional.of(category));
        when(projectRepository.save(project)).thenReturn(project);

        var response = service.update(project.getId(), new UpdateProjectRequestDto("Updated", "Desc", category.getId(), null, null, "private"), callerId);

        assertThat(response.name()).isEqualTo("Updated");
        assertThat(response.categoryId()).isEqualTo(category.getId());
    }

    @Test
    void delete_removesProjectWhenCallerIsAdmin() {
        UUID callerId = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        Project project = TestDataFactory.project(workspace, null);

        when(projectRepository.findById(project.getId())).thenReturn(Optional.of(project));
        when(workspaceMemberRepository.existsByWorkspaceIdAndUserIdAndRole(workspace.getId(), callerId, WorkspaceRole.ADMIN)).thenReturn(true);

        service.delete(project.getId(), callerId);

        verify(projectRepository).deleteById(project.getId());
    }

    @Test
    void getTeamMembers_returnsTeamMembersForProject() {
        UUID callerId = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        Team team = TestDataFactory.team(workspace);
        Project project = TestDataFactory.project(workspace, null);
        project.setTeam(team);
        TeamMember member = TestDataFactory.teamMember(team, UUID.randomUUID(), TeamRole.MEMBER, ScrumRole.DEVELOPER);

        when(projectRepository.findById(project.getId())).thenReturn(Optional.of(project));
        // Workspace admin for access
        when(workspaceMemberRepository.existsByWorkspaceIdAndUserIdAndRole(workspace.getId(), callerId, WorkspaceRole.ADMIN)).thenReturn(true);
        when(teamMemberRepository.findByTeamId(team.getId())).thenReturn(List.of(member));

        var result = service.getTeamMembers(project.getId(), callerId);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).userId()).isEqualTo(member.getUserId());
        assertThat(result.get(0).scrumRole()).isEqualTo(ScrumRole.DEVELOPER);
    }

    @Test
    void getMemberPermissions_returnsWorkspaceAdminAndTeamAdminAndScrumRole() {
        UUID targetUserId = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        Team team = TestDataFactory.team(workspace);
        Project project = TestDataFactory.project(workspace, null);
        project.setTeam(team);
        TeamMember member = TestDataFactory.teamMember(team, targetUserId, TeamRole.ADMIN, ScrumRole.PRODUCT_OWNER);

        when(projectRepository.findById(project.getId())).thenReturn(Optional.of(project));
        when(workspaceMemberRepository.existsByWorkspaceIdAndUserIdAndRole(workspace.getId(), targetUserId, WorkspaceRole.ADMIN)).thenReturn(true);
        when(teamMemberRepository.findByTeamIdAndUserId(team.getId(), targetUserId)).thenReturn(Optional.of(member));

        MemberPermissionsDto response = service.getMemberPermissions(project.getId(), targetUserId);

        assertThat(response.workspaceAdmin()).isTrue();
        assertThat(response.teamAdmin()).isTrue();
        assertThat(response.scrumRole()).isEqualTo(ScrumRole.PRODUCT_OWNER);
    }

    @Test
    void getMemberPermissions_throwsWhenNotTeamMemberAndNotWsAdmin() {
        UUID targetUserId = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        Team team = TestDataFactory.team(workspace);
        Project project = TestDataFactory.project(workspace, null);
        project.setTeam(team);

        when(projectRepository.findById(project.getId())).thenReturn(Optional.of(project));
        when(workspaceMemberRepository.existsByWorkspaceIdAndUserIdAndRole(workspace.getId(), targetUserId, WorkspaceRole.ADMIN)).thenReturn(false);
        when(teamMemberRepository.findByTeamIdAndUserId(team.getId(), targetUserId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getMemberPermissions(project.getId(), targetUserId))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void touchMemberActivity_updatesTeamMemberLastActiveAt() {
        UUID userId = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        Team team = TestDataFactory.team(workspace);
        Project project = TestDataFactory.project(workspace, null);
        project.setTeam(team);
        TeamMember member = TestDataFactory.teamMember(team, userId);

        when(projectRepository.findById(project.getId())).thenReturn(Optional.of(project));
        when(teamMemberRepository.findByTeamIdAndUserId(team.getId(), userId)).thenReturn(Optional.of(member));
        when(teamMemberRepository.save(member)).thenReturn(member);

        service.touchMemberActivity(project.getId(), userId);

        assertThat(member.getLastActiveAt()).isNotNull();
        verify(teamMemberRepository).save(member);
    }

    @Test
    void findById_requiresProjectAccess() {
        UUID callerId = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        Project project = TestDataFactory.project(workspace, null);

        when(projectRepository.findById(project.getId())).thenReturn(Optional.of(project));
        // Not workspace admin
        when(workspaceMemberRepository.existsByWorkspaceIdAndUserIdAndRole(workspace.getId(), callerId, WorkspaceRole.ADMIN)).thenReturn(false);
        // Not workspace member for WORKSPACE-visible check (project visibility is null/PRIVATE by default)
        // No team on project

        assertThatThrownBy(() -> service.findById(project.getId(), callerId))
                .isInstanceOf(ForbiddenException.class);
    }
}