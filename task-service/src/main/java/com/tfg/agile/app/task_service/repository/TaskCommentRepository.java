package com.tfg.agile.app.task_service.repository;

import com.tfg.agile.app.task_service.entity.TaskComment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TaskCommentRepository extends JpaRepository<TaskComment, UUID> {

    List<TaskComment> findByTaskIdOrderByCreatedAtAsc(UUID taskId);
}