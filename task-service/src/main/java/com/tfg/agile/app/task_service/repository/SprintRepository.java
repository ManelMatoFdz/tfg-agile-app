package com.tfg.agile.app.task_service.repository;

import com.tfg.agile.app.task_service.entity.Sprint;
import com.tfg.agile.app.task_service.entity.SprintStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SprintRepository extends JpaRepository<Sprint, UUID> {

    List<Sprint> findByProjectIdOrderByCreatedAtAsc(UUID projectId);

    Optional<Sprint> findByProjectIdAndStatus(UUID projectId, SprintStatus status);

    boolean existsByProjectIdAndStatus(UUID projectId, SprintStatus status);
}