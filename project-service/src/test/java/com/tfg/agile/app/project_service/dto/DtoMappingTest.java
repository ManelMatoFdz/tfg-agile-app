package com.tfg.agile.app.project_service.dto;

import com.tfg.agile.app.project_service.entity.ProjectRole;
import com.tfg.agile.app.project_service.entity.WorkspaceRole;
import com.tfg.agile.app.project_service.support.TestDataFactory;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class DtoMappingTest {

    @Test
    void workspaceResponseDto_fromMapsEntity() {
        var workspace = TestDataFactory.workspace();

        WorkspaceResponseDto dto = WorkspaceResponseDto.from(workspace);

        assertThat(dto.id()).isEqualTo(workspace.getId());
        assertThat(dto.name()).isEqualTo(workspace.getName());
    }

    @Test
    void projectResponseDto_fromMapsEntityIncludingNullableCategory() {
        var workspace = TestDataFactory.workspace();
        var project = TestDataFactory.project(workspace, null);

        ProjectResponseDto dto = ProjectResponseDto.from(project);

        assertThat(dto.workspaceId()).isEqualTo(workspace.getId());
        assertThat(dto.categoryId()).isNull();
    }

    @Test
    void teamAndCategoryResponseDto_fromMapsEntity() {
        var workspace = TestDataFactory.workspace();
        var team = TestDataFactory.team(workspace);
        var category = TestDataFactory.category(workspace);

        TeamResponseDto teamDto = TeamResponseDto.from(team);
        CategoryResponseDto categoryDto = CategoryResponseDto.from(category);

        assertThat(teamDto.workspaceId()).isEqualTo(workspace.getId());
        assertThat(categoryDto.workspaceId()).isEqualTo(workspace.getId());
    }

    @Test
    void memberResponseDtos_fromMapEntity() {
        var workspace = TestDataFactory.workspace();
        var project = TestDataFactory.project(workspace, null);
        var team = TestDataFactory.team(workspace);

        var workspaceMember = TestDataFactory.workspaceMember(workspace, java.util.UUID.randomUUID(), WorkspaceRole.ADMIN);
        var projectMember = TestDataFactory.projectMember(project, java.util.UUID.randomUUID(), ProjectRole.MEMBER);
        var teamMember = TestDataFactory.teamMember(team, java.util.UUID.randomUUID());

        WorkspaceMemberResponseDto workspaceDto = WorkspaceMemberResponseDto.from(workspaceMember);
        ProjectMemberResponseDto projectDto = ProjectMemberResponseDto.from(projectMember);
        TeamMemberResponseDto teamDto = TeamMemberResponseDto.from(teamMember);

        assertThat(workspaceDto.userId()).isEqualTo(workspaceMember.getUserId());
        assertThat(projectDto.role()).isEqualTo(ProjectRole.MEMBER);
        assertThat(teamDto.userId()).isEqualTo(teamMember.getUserId());
    }
}

