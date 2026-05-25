package com.tfg.agile.app.task_service.repository;

import com.tfg.agile.app.task_service.entity.SprintTaskSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SprintTaskSnapshotRepository extends JpaRepository<SprintTaskSnapshot, UUID> {
    List<SprintTaskSnapshot> findBySprintId(UUID sprintId);
}