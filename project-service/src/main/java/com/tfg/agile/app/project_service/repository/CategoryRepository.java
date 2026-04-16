package com.tfg.agile.app.project_service.repository;

import com.tfg.agile.app.project_service.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CategoryRepository extends JpaRepository<Category, UUID> {

    List<Category> findByWorkspaceIdOrderByPosition(UUID workspaceId);
}