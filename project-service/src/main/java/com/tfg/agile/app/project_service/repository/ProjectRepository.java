package com.tfg.agile.app.project_service.repository;

import com.tfg.agile.app.project_service.entity.Project;
import com.tfg.agile.app.project_service.entity.ProjectVisibility;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface ProjectRepository extends JpaRepository<Project, UUID> {

    List<Project> findByWorkspaceId(UUID workspaceId);

    @Query("SELECT p FROM Project p WHERE p.workspace.id = :workspaceId " +
           "AND (p.visibility = :visibility " +
           "OR EXISTS (SELECT pm FROM ProjectMember pm WHERE pm.project.id = p.id AND pm.userId = :userId))")
    List<Project> findVisibleByWorkspaceIdAndUserId(@Param("workspaceId") UUID workspaceId,
                                                    @Param("userId") UUID userId,
                                                    @Param("visibility") ProjectVisibility visibility);
}