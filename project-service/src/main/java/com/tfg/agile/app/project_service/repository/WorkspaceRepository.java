package com.tfg.agile.app.project_service.repository;

import com.tfg.agile.app.project_service.entity.Workspace;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface WorkspaceRepository extends JpaRepository<Workspace, UUID> {
}