package com.tfg.agile.app.task_service.repository;

import com.tfg.agile.app.task_service.entity.Epic;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface EpicRepository extends JpaRepository<Epic, UUID> {

    List<Epic> findByProjectIdOrderByNameAsc(UUID projectId);
}