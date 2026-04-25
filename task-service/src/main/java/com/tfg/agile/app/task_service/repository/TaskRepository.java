package com.tfg.agile.app.task_service.repository;

import com.tfg.agile.app.task_service.entity.Task;
import com.tfg.agile.app.task_service.entity.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TaskRepository extends JpaRepository<Task, UUID> {

    List<Task> findByProjectIdOrderByStatusAscPositionAsc(UUID projectId);

    List<Task> findByProjectIdAndStatusOrderByPositionAsc(UUID projectId, TaskStatus status);

    List<Task> findByProjectIdAndSprintIdIsNullOrderByPriorityDescPositionAsc(UUID projectId);

    List<Task> findBySprintIdOrderByStatusAscPositionAsc(UUID sprintId);

    List<Task> findByAssigneeId(UUID assigneeId);
}