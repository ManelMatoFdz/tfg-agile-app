package com.tfg.agile.app.project_service.service;

import com.tfg.agile.app.project_service.dto.*;
import com.tfg.agile.app.project_service.entity.Category;
import com.tfg.agile.app.project_service.entity.ProjectRole;
import com.tfg.agile.app.project_service.exception.ForbiddenException;
import com.tfg.agile.app.project_service.exception.ResourceNotFoundException;
import com.tfg.agile.app.project_service.repository.CategoryRepository;
import com.tfg.agile.app.project_service.repository.ProjectMemberRepository;
import com.tfg.agile.app.project_service.repository.ProjectRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;

    public CategoryService(CategoryRepository categoryRepository,
                           ProjectRepository projectRepository,
                           ProjectMemberRepository projectMemberRepository) {
        this.categoryRepository = categoryRepository;
        this.projectRepository = projectRepository;
        this.projectMemberRepository = projectMemberRepository;
    }

    @Transactional
    public CategoryResponseDto create(UUID projectId, CreateCategoryRequestDto dto, UUID callerId) {
        var project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));
        requireProjectAdminOrMember(projectId, callerId);

        Category category = Category.builder()
                .project(project)
                .name(dto.name())
                .color(dto.color())
                .position(dto.position())
                .build();
        return CategoryResponseDto.from(categoryRepository.save(category));
    }

    @Transactional(readOnly = true)
    public List<CategoryResponseDto> findByProject(UUID projectId, UUID callerId) {
        projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));
        requireProjectMember(projectId, callerId);
        return categoryRepository.findByProjectIdOrderByPosition(projectId).stream()
                .map(CategoryResponseDto::from)
                .toList();
    }

    @Transactional
    public CategoryResponseDto update(UUID categoryId, UpdateCategoryRequestDto dto, UUID callerId) {
        Category category = getCategoryOrThrow(categoryId);
        requireProjectAdminOrMember(category.getProject().getId(), callerId);
        category.setName(dto.name());
        category.setColor(dto.color());
        category.setPosition(dto.position());
        return CategoryResponseDto.from(categoryRepository.save(category));
    }

    @Transactional
    public void delete(UUID categoryId, UUID callerId) {
        Category category = getCategoryOrThrow(categoryId);
        requireProjectAdminOrMember(category.getProject().getId(), callerId);
        categoryRepository.deleteById(categoryId);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private Category getCategoryOrThrow(UUID id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
    }

    private void requireProjectMember(UUID projectId, UUID userId) {
        if (!projectMemberRepository.existsByProjectIdAndUserId(projectId, userId)) {
            throw new ForbiddenException("Not a member of this project");
        }
    }

    private void requireProjectAdminOrMember(UUID projectId, UUID userId) {
        var membership = projectMemberRepository.findByProjectIdAndUserId(projectId, userId)
                .orElseThrow(() -> new ForbiddenException("Not a member of this project"));
        if (membership.getRole() == ProjectRole.VIEWER) {
            throw new ForbiddenException("Viewer role cannot manage categories");
        }
    }
}