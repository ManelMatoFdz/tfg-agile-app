package com.tfg.agile.app.project_service.service;

import com.tfg.agile.app.project_service.dto.*;
import com.tfg.agile.app.project_service.entity.Category;
import com.tfg.agile.app.project_service.entity.WorkspaceRole;
import com.tfg.agile.app.project_service.exception.ForbiddenException;
import com.tfg.agile.app.project_service.exception.ResourceNotFoundException;
import com.tfg.agile.app.project_service.repository.CategoryRepository;
import com.tfg.agile.app.project_service.repository.WorkspaceMemberRepository;
import com.tfg.agile.app.project_service.repository.WorkspaceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;

    public CategoryService(CategoryRepository categoryRepository,
                           WorkspaceRepository workspaceRepository,
                           WorkspaceMemberRepository workspaceMemberRepository) {
        this.categoryRepository = categoryRepository;
        this.workspaceRepository = workspaceRepository;
        this.workspaceMemberRepository = workspaceMemberRepository;
    }

    @Transactional
    public CategoryResponseDto create(UUID workspaceId, CreateCategoryRequestDto dto, UUID callerId) {
        var workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("WORKSPACE_NOT_FOUND"));
        requireWorkspaceMember(workspaceId, callerId);

        Category category = Category.builder()
                .workspace(workspace)
                .name(dto.name())
                .color(dto.color())
                .position(dto.position())
                .build();
        return CategoryResponseDto.from(categoryRepository.save(category));
    }

    @Transactional(readOnly = true)
    public List<CategoryResponseDto> findByWorkspace(UUID workspaceId, UUID callerId) {
        workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("WORKSPACE_NOT_FOUND"));
        requireWorkspaceMember(workspaceId, callerId);
        return categoryRepository.findByWorkspaceIdOrderByPosition(workspaceId).stream()
                .map(CategoryResponseDto::from)
                .toList();
    }

    @Transactional
    public CategoryResponseDto update(UUID workspaceId, UUID categoryId,
                                      UpdateCategoryRequestDto dto, UUID callerId) {
        requireWorkspaceAdmin(workspaceId, callerId);
        Category category = getCategoryOrThrow(categoryId);
        category.setName(dto.name());
        category.setColor(dto.color());
        category.setPosition(dto.position());
        return CategoryResponseDto.from(categoryRepository.save(category));
    }

    @Transactional
    public void delete(UUID workspaceId, UUID categoryId, UUID callerId) {
        requireWorkspaceAdmin(workspaceId, callerId);
        getCategoryOrThrow(categoryId);
        categoryRepository.deleteById(categoryId);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private Category getCategoryOrThrow(UUID id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("CATEGORY_NOT_FOUND"));
    }

    private void requireWorkspaceMember(UUID workspaceId, UUID userId) {
        if (!workspaceMemberRepository.existsByWorkspaceIdAndUserId(workspaceId, userId)) {
            throw new ForbiddenException("NOT_WORKSPACE_MEMBER");
        }
    }

    private void requireWorkspaceAdmin(UUID workspaceId, UUID userId) {
        if (!workspaceMemberRepository.existsByWorkspaceIdAndUserIdAndRole(workspaceId, userId, WorkspaceRole.ADMIN)) {
            throw new ForbiddenException("WORKSPACE_ADMIN_REQUIRED");
        }
    }
}