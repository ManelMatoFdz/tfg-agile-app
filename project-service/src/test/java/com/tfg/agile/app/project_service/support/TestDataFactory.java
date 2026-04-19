package com.tfg.agile.app.project_service.support;

import com.tfg.agile.app.project_service.entity.Category;
import com.tfg.agile.app.project_service.entity.Project;
import com.tfg.agile.app.project_service.entity.ProjectMember;
import com.tfg.agile.app.project_service.entity.ProjectRole;
import com.tfg.agile.app.project_service.entity.Team;
import com.tfg.agile.app.project_service.entity.TeamMember;
import com.tfg.agile.app.project_service.entity.Workspace;
import com.tfg.agile.app.project_service.entity.WorkspaceMember;
import com.tfg.agile.app.project_service.entity.WorkspaceRole;

import java.time.Instant;
import java.util.UUID;

public final class TestDataFactory {

    private TestDataFactory() {
    }

    public static Workspace workspace() {
        Instant now = Instant.now();
        return Workspace.builder()
                .id(UUID.randomUUID())
                .name("Workspace")
                .description("Workspace description")
                .ownerId(UUID.randomUUID())
                .createdAt(now)
                .updatedAt(now)
                .build();
    }

    public static Category category(Workspace workspace) {
        return Category.builder()
                .id(UUID.randomUUID())
                .workspace(workspace)
                .name("Backend")
                .color("#3366FF")
                .position(1)
                .createdAt(Instant.now())
                .build();
    }

    public static Project project(Workspace workspace, Category category) {
        Instant now = Instant.now();
        return Project.builder()
                .id(UUID.randomUUID())
                .workspace(workspace)
                .category(category)
                .name("Project")
                .description("Project description")
                .createdAt(now)
                .updatedAt(now)
                .build();
    }

    public static Team team(Workspace workspace) {
        Instant now = Instant.now();
        return Team.builder()
                .id(UUID.randomUUID())
                .workspace(workspace)
                .name("Team A")
                .description("Team description")
                .createdAt(now)
                .updatedAt(now)
                .build();
    }

    public static WorkspaceMember workspaceMember(Workspace workspace, UUID userId, WorkspaceRole role) {
        return WorkspaceMember.builder()
                .id(UUID.randomUUID())
                .workspace(workspace)
                .userId(userId)
                .role(role)
                .joinedAt(Instant.now())
                .build();
    }

    public static ProjectMember projectMember(Project project, UUID userId, ProjectRole role) {
        return ProjectMember.builder()
                .id(UUID.randomUUID())
                .project(project)
                .userId(userId)
                .role(role)
                .joinedAt(Instant.now())
                .build();
    }

    public static TeamMember teamMember(Team team, UUID userId) {
        return TeamMember.builder()
                .id(UUID.randomUUID())
                .team(team)
                .userId(userId)
                .joinedAt(Instant.now())
                .build();
    }
}

