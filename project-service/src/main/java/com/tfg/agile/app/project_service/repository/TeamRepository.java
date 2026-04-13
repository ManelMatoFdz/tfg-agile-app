package com.tfg.agile.app.project_service.repository;

import com.tfg.agile.app.project_service.entity.Team;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TeamRepository extends JpaRepository<Team, UUID> {

    List<Team> findByWorkspaceId(UUID workspaceId);
}