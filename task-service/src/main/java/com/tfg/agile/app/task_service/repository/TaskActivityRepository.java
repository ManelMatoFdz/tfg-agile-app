package com.tfg.agile.app.task_service.repository;

import com.tfg.agile.app.task_service.entity.TaskActivity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TaskActivityRepository extends JpaRepository<TaskActivity, UUID> {

    List<TaskActivity> findByTaskIdOrderByCreatedAtAsc(UUID taskId);
}