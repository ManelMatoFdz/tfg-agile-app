package com.tfg.agile.app.project_service.service;

import com.tfg.agile.app.project_service.dto.AddMemberRequestDto;
import com.tfg.agile.app.project_service.dto.AddTeamMembersRequestDto;
import com.tfg.agile.app.project_service.dto.CreateProjectRequestDto;
import com.tfg.agile.app.project_service.dto.UpdateMemberRoleRequestDto;
import com.tfg.agile.app.project_service.dto.UpdateProjectRequestDto;
import com.tfg.agile.app.project_service.entity.Category;
import com.tfg.agile.app.project_service.entity.Project;
import com.tfg.agile.app.project_service.entity.ProjectMember;
import com.tfg.agile.app.project_service.entity.ProjectRole;
import com.tfg.agile.app.project_service.entity.Team;
import com.tfg.agile.app.project_service.entity.TeamMember;
import com.tfg.agile.app.project_service.entity.Workspace;
import com.tfg.agile.app.project_service.exception.ConflictException;
import com.tfg.agile.app.project_service.exception.ForbiddenException;
import com.tfg.agile.app.project_service.exception.ResourceNotFoundException;
import com.tfg.agile.app.project_service.repository.CategoryRepository;
import com.tfg.agile.app.project_service.repository.ProjectMemberRepository;
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
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProjectServiceTest {

    @Mock
    private ProjectRepository projectRepository;
    @Mock
    private ProjectMemberRepository projectMemberRepository;
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
                projectMemberRepository,
                workspaceRepository,
                workspaceMemberRepository,
                teamRepository,
                teamMemberRepository,
                categoryRepository
        );
    }

    @Test
    void create_persistsProjectAndAdminMember() {
        UUID callerId = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        Category category = TestDataFactory.category(workspace);
        Project project = TestDataFactory.project(workspace, category);

        when(workspaceRepository.findById(workspace.getId())).thenReturn(Optional.of(workspace));
        when(workspaceMemberRepository.existsByWorkspaceIdAndUserId(workspace.getId(), callerId)).thenReturn(true);
        when(categoryRepository.findById(category.getId())).thenReturn(Optional.of(category));
        when(projectRepository.save(any(Project.class))).thenReturn(project);
        when(projectMemberRepository.save(any(ProjectMember.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = service.create(workspace.getId(), new CreateProjectRequestDto("API", "Desc", category.getId()), callerId);

        assertThat(response.name()).isEqualTo("API");
        assertThat(response.workspaceId()).isEqualTo(workspace.getId());
        verify(projectMemberRepository).save(any(ProjectMember.class));
    }

    @Test
    void create_throwsWhenCategoryBelongsToAnotherWorkspace() {
        UUID callerId = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        Workspace otherWorkspace = TestDataFactory.workspace();
        Category foreignCategory = TestDataFactory.category(otherWorkspace);

        when(workspaceRepository.findById(workspace.getId())).thenReturn(Optional.of(workspace));
        when(workspaceMemberRepository.existsByWorkspaceIdAndUserId(workspace.getId(), callerId)).thenReturn(true);
        when(categoryRepository.findById(foreignCategory.getId())).thenReturn(Optional.of(foreignCategory));

        assertThatThrownBy(() -> service.create(workspace.getId(), new CreateProjectRequestDto("API", "Desc", foreignCategory.getId()), callerId))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void findByWorkspace_returnsOnlyProjectsForCallerMembership() {
        UUID callerId = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        Project project = TestDataFactory.project(workspace, null);

        when(workspaceRepository.findById(workspace.getId())).thenReturn(Optional.of(workspace));
        when(workspaceMemberRepository.existsByWorkspaceIdAndUserId(workspace.getId(), callerId)).thenReturn(true);
        when(projectMemberRepository.findProjectsByUserIdAndWorkspaceId(callerId, workspace.getId())).thenReturn(List.of(project));

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
    void update_requiresProjectAdmin() {
        UUID callerId = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        Project project = TestDataFactory.project(workspace, null);

        when(projectRepository.findById(project.getId())).thenReturn(Optional.of(project));
        when(projectMemberRepository.existsByProjectIdAndUserIdAndRole(project.getId(), callerId, ProjectRole.ADMIN)).thenReturn(false);

        assertThatThrownBy(() -> service.update(project.getId(), new UpdateProjectRequestDto("Name", "Desc", null), callerId))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void update_savesProjectWithResolvedCategory() {
        UUID callerId = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        Category category = TestDataFactory.category(workspace);
        Project project = TestDataFactory.project(workspace, null);

        when(projectRepository.findById(project.getId())).thenReturn(Optional.of(project));
        when(projectMemberRepository.existsByProjectIdAndUserIdAndRole(project.getId(), callerId, ProjectRole.ADMIN)).thenReturn(true);
        when(categoryRepository.findById(category.getId())).thenReturn(Optional.of(category));
        when(projectRepository.save(project)).thenReturn(project);

        var response = service.update(project.getId(), new UpdateProjectRequestDto("Updated", "Desc", category.getId()), callerId);

        assertThat(response.name()).isEqualTo("Updated");
        assertThat(response.categoryId()).isEqualTo(category.getId());
    }

    @Test
    void delete_removesProjectWhenCallerIsAdmin() {
        UUID callerId = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        Project project = TestDataFactory.project(workspace, null);

        when(projectRepository.findById(project.getId())).thenReturn(Optional.of(project));
        when(projectMemberRepository.existsByProjectIdAndUserIdAndRole(project.getId(), callerId, ProjectRole.ADMIN)).thenReturn(true);

        service.delete(project.getId(), callerId);

        verify(projectRepository).deleteById(project.getId());
    }

    @Test
    void getMembers_returnsProjectMembersForCaller() {
        UUID callerId = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        Project project = TestDataFactory.project(workspace, null);
        ProjectMember member = TestDataFactory.projectMember(project, UUID.randomUUID(), ProjectRole.MEMBER);

        when(projectRepository.findById(project.getId())).thenReturn(Optional.of(project));
        when(projectMemberRepository.existsByProjectIdAndUserId(project.getId(), callerId)).thenReturn(true);
        when(projectMemberRepository.findByProjectId(project.getId())).thenReturn(List.of(member));

        var result = service.getMembers(project.getId(), callerId);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).userId()).isEqualTo(member.getUserId());
    }

    @Test
    void addMember_createsProjectMemberWithRole() {
        UUID callerId = UUID.randomUUID();
        UUID targetUserId = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        Project project = TestDataFactory.project(workspace, null);
        ProjectMember savedMember = TestDataFactory.projectMember(project, targetUserId, ProjectRole.VIEWER);

        when(projectRepository.findById(project.getId())).thenReturn(Optional.of(project));
        when(projectMemberRepository.existsByProjectIdAndUserIdAndRole(project.getId(), callerId, ProjectRole.ADMIN)).thenReturn(true);
        when(projectMemberRepository.existsByProjectIdAndUserId(project.getId(), targetUserId)).thenReturn(false);
        when(projectMemberRepository.save(any(ProjectMember.class))).thenReturn(savedMember);

        var response = service.addMember(project.getId(), new AddMemberRequestDto(targetUserId, "viewer"), callerId);

        assertThat(response.userId()).isEqualTo(targetUserId);
        assertThat(response.role()).isEqualTo(ProjectRole.VIEWER);
    }

    @Test
    void updateMemberRole_updatesMemberRoleWhenFound() {
        UUID callerId = UUID.randomUUID();
        UUID targetUserId = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        Project project = TestDataFactory.project(workspace, null);
        ProjectMember member = TestDataFactory.projectMember(project, targetUserId, ProjectRole.MEMBER);

        when(projectRepository.findById(project.getId())).thenReturn(Optional.of(project));
        when(projectMemberRepository.existsByProjectIdAndUserIdAndRole(project.getId(), callerId, ProjectRole.ADMIN)).thenReturn(true);
        when(projectMemberRepository.findByProjectIdAndUserId(project.getId(), targetUserId)).thenReturn(Optional.of(member));
        when(projectMemberRepository.save(member)).thenReturn(member);

        var response = service.updateMemberRole(project.getId(), targetUserId, new UpdateMemberRoleRequestDto("admin"), callerId);

        assertThat(response.role()).isEqualTo(ProjectRole.ADMIN);
    }

    @Test
    void addMembersFromTeam_throwsWhenTeamDoesNotExist() {
        UUID callerId = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        Project project = TestDataFactory.project(workspace, null);
        UUID teamId = UUID.randomUUID();

        when(projectRepository.findById(project.getId())).thenReturn(Optional.of(project));
        when(projectMemberRepository.existsByProjectIdAndUserIdAndRole(project.getId(), callerId, ProjectRole.ADMIN)).thenReturn(true);
        when(teamRepository.findById(teamId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.addMembersFromTeam(project.getId(), teamId, null, callerId))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void addMembersFromTeam_throwsWhenProvidedUsersAreNotInTeam() {
        UUID callerId = UUID.randomUUID();
        UUID invalidUser = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        Project project = TestDataFactory.project(workspace, null);
        Team team = TestDataFactory.team(workspace);

        when(projectRepository.findById(project.getId())).thenReturn(Optional.of(project));
        when(projectMemberRepository.existsByProjectIdAndUserIdAndRole(project.getId(), callerId, ProjectRole.ADMIN)).thenReturn(true);
        when(teamRepository.findById(team.getId())).thenReturn(Optional.of(team));
        when(teamMemberRepository.findByTeamId(team.getId())).thenReturn(List.of());

        assertThatThrownBy(() -> service.addMembersFromTeam(project.getId(), team.getId(), new AddTeamMembersRequestDto(List.of(invalidUser)), callerId))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void addMembersFromTeam_addsOnlyMissingUsers() {
        UUID callerId = UUID.randomUUID();
        UUID existingUser = UUID.randomUUID();
        UUID newUser = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        Project project = TestDataFactory.project(workspace, null);
        Team team = TestDataFactory.team(workspace);

        TeamMember tm1 = TestDataFactory.teamMember(team, existingUser);
        TeamMember tm2 = TestDataFactory.teamMember(team, newUser);
        ProjectMember existing = TestDataFactory.projectMember(project, existingUser, ProjectRole.MEMBER);

        when(projectRepository.findById(project.getId())).thenReturn(Optional.of(project));
        when(projectMemberRepository.existsByProjectIdAndUserIdAndRole(project.getId(), callerId, ProjectRole.ADMIN)).thenReturn(true);
        when(teamRepository.findById(team.getId())).thenReturn(Optional.of(team));
        when(teamMemberRepository.findByTeamId(team.getId())).thenReturn(List.of(tm1, tm2));
        when(projectMemberRepository.findByProjectIdAndUserIdIn(project.getId(), List.of(existingUser, newUser))).thenReturn(List.of(existing));
        when(projectMemberRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var result = service.addMembersFromTeam(project.getId(), team.getId(), null, callerId);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).userId()).isEqualTo(newUser);
    }

    @Test
    void removeMember_deletesMemberWhenFound() {
        UUID callerId = UUID.randomUUID();
        UUID targetUserId = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        Project project = TestDataFactory.project(workspace, null);
        ProjectMember member = TestDataFactory.projectMember(project, targetUserId, ProjectRole.MEMBER);

        when(projectRepository.findById(project.getId())).thenReturn(Optional.of(project));
        when(projectMemberRepository.existsByProjectIdAndUserIdAndRole(project.getId(), callerId, ProjectRole.ADMIN)).thenReturn(true);
        when(projectMemberRepository.findByProjectIdAndUserId(project.getId(), targetUserId)).thenReturn(Optional.of(member));

        service.removeMember(project.getId(), targetUserId, callerId);

        verify(projectMemberRepository).delete(member);
    }

    @Test
    void removeMember_throwsWhenMemberDoesNotExist() {
        UUID callerId = UUID.randomUUID();
        UUID targetUserId = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        Project project = TestDataFactory.project(workspace, null);

        when(projectRepository.findById(project.getId())).thenReturn(Optional.of(project));
        when(projectMemberRepository.existsByProjectIdAndUserIdAndRole(project.getId(), callerId, ProjectRole.ADMIN)).thenReturn(true);
        when(projectMemberRepository.findByProjectIdAndUserId(project.getId(), targetUserId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.removeMember(project.getId(), targetUserId, callerId))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void findById_requiresProjectMembership() {
        UUID callerId = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        Project project = TestDataFactory.project(workspace, null);

        when(projectRepository.findById(project.getId())).thenReturn(Optional.of(project));
        when(projectMemberRepository.existsByProjectIdAndUserId(project.getId(), callerId)).thenReturn(false);

        assertThatThrownBy(() -> service.findById(project.getId(), callerId))
                .isInstanceOf(ForbiddenException.class);
        verify(projectMemberRepository, never()).findByProjectId(project.getId());
    }
}
