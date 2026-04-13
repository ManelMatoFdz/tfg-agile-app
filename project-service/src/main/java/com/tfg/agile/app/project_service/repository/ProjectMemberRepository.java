package com.tfg.agile.app.project_service.repository;

import com.tfg.agile.app.project_service.entity.Project;
import com.tfg.agile.app.project_service.entity.ProjectMember;
import com.tfg.agile.app.project_service.entity.ProjectRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProjectMemberRepository extends JpaRepository<ProjectMember, UUID> {

    List<ProjectMember> findByProjectId(UUID projectId);

    List<ProjectMember> findByUserId(UUID userId);

    Optional<ProjectMember> findByProjectIdAndUserId(UUID projectId, UUID userId);

    boolean existsByProjectIdAndUserId(UUID projectId, UUID userId);

    boolean existsByProjectIdAndUserIdAndRole(UUID projectId, UUID userId, ProjectRole role);

    @Query("SELECT pm.project FROM ProjectMember pm WHERE pm.userId = :userId AND pm.project.workspace.id = :workspaceId")
    List<Project> findProjectsByUserIdAndWorkspaceId(@Param("userId") UUID userId,
                                                     @Param("workspaceId") UUID workspaceId);

    List<ProjectMember> findByProjectIdAndUserIdIn(UUID projectId, List<UUID> userIds);
}