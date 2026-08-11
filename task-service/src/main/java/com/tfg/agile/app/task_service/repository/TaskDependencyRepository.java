package com.tfg.agile.app.task_service.repository;

import com.tfg.agile.app.task_service.entity.TaskDependency;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TaskDependencyRepository extends JpaRepository<TaskDependency, UUID> {

    /** Dependencies where this task is the one blocking others */
    List<TaskDependency> findByBlockingTaskId(UUID blockingTaskId);

    /** Dependencies where this task is blocked by others */
    List<TaskDependency> findByBlockedTaskId(UUID blockedTaskId);

    /** All dependencies involving a task (either side) */
    List<TaskDependency> findByBlockingTaskIdOrBlockedTaskId(UUID blockingTaskId, UUID blockedTaskId);

    /** All dependencies for tasks within a project — found via task IDs list */
    List<TaskDependency> findByBlockingTaskIdInOrBlockedTaskIdIn(List<UUID> blockingIds, List<UUID> blockedIds);

    int countByBlockedTaskId(UUID blockedTaskId);

    int countByBlockingTaskId(UUID blockingTaskId);
}
