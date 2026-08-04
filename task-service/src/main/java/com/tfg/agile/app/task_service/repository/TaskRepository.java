package com.tfg.agile.app.task_service.repository;

import com.tfg.agile.app.task_service.entity.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface TaskRepository extends JpaRepository<Task, UUID>, JpaSpecificationExecutor<Task> {

    List<Task> findByProjectIdOrderByStatusAscPositionAsc(UUID projectId);

    List<Task> findByProjectIdAndStatusOrderByPositionAsc(UUID projectId, String status);

    List<Task> findByProjectIdAndSprintIdIsNullOrderByPriorityDescPositionAsc(UUID projectId);

    List<Task> findBySprintIdOrderByStatusAscPositionAsc(UUID sprintId);

    List<Task> findByAssigneeId(UUID assigneeId);

    List<Task> findByProjectId(UUID projectId);

    // Subtask queries
    List<Task> findByParentId(UUID parentId);

    int countByParentId(UUID parentId);

    int countByParentIdAndStatusIn(UUID parentId, Collection<String> statuses);

    long countByProjectIdAndStatus(UUID projectId, String status);

    List<Task> findByParentIdAndSprintId(UUID parentId, UUID sprintId);

    // Epic queries
    List<Task> findByEpicIdOrderByPositionAsc(UUID epicId);

    int countByEpicId(UUID epicId);

    int countByEpicIdAndStatusIn(UUID epicId, java.util.Collection<String> statuses);
}