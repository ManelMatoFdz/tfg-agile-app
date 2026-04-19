package com.tfg.agile.app.project_service.entity;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class EntityLifecycleTest {

    @Test
    void workspace_lifecycleSetsTimestamps() {
        Workspace workspace = Workspace.builder().name("Workspace").ownerId(java.util.UUID.randomUUID()).build();

        workspace.prePersist();
        assertThat(workspace.getCreatedAt()).isNotNull();
        assertThat(workspace.getUpdatedAt()).isNotNull();

        var previousUpdatedAt = workspace.getUpdatedAt();
        workspace.preUpdate();
        assertThat(workspace.getUpdatedAt()).isAfterOrEqualTo(previousUpdatedAt);
    }

    @Test
    void project_lifecycleSetsTimestamps() {
        Workspace workspace = Workspace.builder().name("Workspace").ownerId(java.util.UUID.randomUUID()).build();
        Project project = Project.builder().workspace(workspace).name("Project").build();

        project.prePersist();
        assertThat(project.getCreatedAt()).isNotNull();
        assertThat(project.getUpdatedAt()).isNotNull();

        var previousUpdatedAt = project.getUpdatedAt();
        project.preUpdate();
        assertThat(project.getUpdatedAt()).isAfterOrEqualTo(previousUpdatedAt);
    }

    @Test
    void team_lifecycleSetsTimestamps() {
        Workspace workspace = Workspace.builder().name("Workspace").ownerId(java.util.UUID.randomUUID()).build();
        Team team = Team.builder().workspace(workspace).name("Team").build();

        team.prePersist();
        assertThat(team.getCreatedAt()).isNotNull();
        assertThat(team.getUpdatedAt()).isNotNull();

        var previousUpdatedAt = team.getUpdatedAt();
        team.preUpdate();
        assertThat(team.getUpdatedAt()).isAfterOrEqualTo(previousUpdatedAt);
    }

    @Test
    void category_prePersistSetsCreatedAt() {
        Workspace workspace = Workspace.builder().name("Workspace").ownerId(java.util.UUID.randomUUID()).build();
        Category category = Category.builder().workspace(workspace).name("Category").position(0).build();

        category.prePersist();

        assertThat(category.getCreatedAt()).isNotNull();
    }

    @Test
    void memberEntities_prePersistSetJoinedAt() {
        Workspace workspace = Workspace.builder().name("Workspace").ownerId(java.util.UUID.randomUUID()).build();
        Project project = Project.builder().workspace(workspace).name("Project").build();
        Team team = Team.builder().workspace(workspace).name("Team").build();

        WorkspaceMember workspaceMember = WorkspaceMember.builder().workspace(workspace).userId(java.util.UUID.randomUUID()).role(WorkspaceRole.MEMBER).build();
        ProjectMember projectMember = ProjectMember.builder().project(project).userId(java.util.UUID.randomUUID()).role(ProjectRole.MEMBER).build();
        TeamMember teamMember = TeamMember.builder().team(team).userId(java.util.UUID.randomUUID()).build();

        workspaceMember.prePersist();
        projectMember.prePersist();
        teamMember.prePersist();

        assertThat(workspaceMember.getJoinedAt()).isNotNull();
        assertThat(projectMember.getJoinedAt()).isNotNull();
        assertThat(teamMember.getJoinedAt()).isNotNull();
    }
}

