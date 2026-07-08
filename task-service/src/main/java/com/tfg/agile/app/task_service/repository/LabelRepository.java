package com.tfg.agile.app.task_service.repository;

import com.tfg.agile.app.task_service.entity.Label;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface LabelRepository extends JpaRepository<Label, UUID> {

    List<Label> findByProjectIdOrderByNameAsc(UUID projectId);
}