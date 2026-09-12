package com.tfg.agile.app.task_service.repository;

import com.tfg.agile.app.task_service.entity.SprintTaskSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface SprintTaskSnapshotRepository extends JpaRepository<SprintTaskSnapshot, UUID> {
    List<SprintTaskSnapshot> findBySprintId(UUID sprintId);

    @Modifying
    @Query("DELETE FROM SprintTaskSnapshot s WHERE s.sprintId IN (SELECT sp.id FROM Sprint sp WHERE sp.projectId = :projectId)")
    void deleteByProjectId(@Param("projectId") UUID projectId);
}