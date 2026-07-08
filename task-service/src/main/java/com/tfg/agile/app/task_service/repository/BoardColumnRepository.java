package com.tfg.agile.app.task_service.repository;

import com.tfg.agile.app.task_service.entity.BoardColumn;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface BoardColumnRepository extends JpaRepository<BoardColumn, UUID> {

    List<BoardColumn> findByProjectIdOrderByPositionAsc(UUID projectId);

    void deleteByProjectId(UUID projectId);

    long countByProjectId(UUID projectId);
}