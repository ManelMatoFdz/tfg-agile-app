package com.tfg.agile.app.task_service.repository;

import com.tfg.agile.app.task_service.entity.TaskActivity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface TaskActivityRepository extends JpaRepository<TaskActivity, UUID> {

    List<TaskActivity> findByTaskIdOrderByCreatedAtAsc(UUID taskId);

    @Modifying
    @Query("DELETE FROM TaskActivity a WHERE a.taskId IN (SELECT t.id FROM Task t WHERE t.projectId = :projectId)")
    void deleteByProjectId(@Param("projectId") UUID projectId);
}