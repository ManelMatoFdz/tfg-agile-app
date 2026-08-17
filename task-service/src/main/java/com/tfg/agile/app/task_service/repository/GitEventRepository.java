package com.tfg.agile.app.task_service.repository;

import com.tfg.agile.app.task_service.entity.GitEvent;
import com.tfg.agile.app.task_service.entity.GitEventType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface GitEventRepository extends JpaRepository<GitEvent, UUID> {

    List<GitEvent> findByTaskIdOrderByReceivedAtDesc(UUID taskId);

    List<GitEvent> findByProjectIdOrderByReceivedAtDesc(UUID projectId);

    List<GitEvent> findByProjectIdAndTypeOrderByReceivedAtDesc(UUID projectId, GitEventType type);

    Page<GitEvent> findByProjectIdAndType(UUID projectId, GitEventType type, Pageable pageable);

    Page<GitEvent> findByProjectIdAndTypeAndStatus(UUID projectId, GitEventType type,
                                                   String status, Pageable pageable);

    Optional<GitEvent> findByProjectIdAndTypeAndExternalId(UUID projectId, GitEventType type, String externalId);

    List<GitEvent> findByTaskIdIn(List<UUID> taskIds);

    int countByTaskId(UUID taskId);

    void deleteByTaskId(UUID taskId);

    void deleteByProjectId(UUID projectId);
}
