package com.tfg.agile.app.task_service.repository;

import com.tfg.agile.app.task_service.entity.GitIntegration;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface GitIntegrationRepository extends JpaRepository<GitIntegration, UUID> {
    Optional<GitIntegration> findByProjectId(UUID projectId);
    void deleteByProjectId(UUID projectId);
}
