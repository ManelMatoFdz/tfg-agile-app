package com.tfg.agile.app.project_service.controller;

import com.tfg.agile.app.project_service.dto.*;
import com.tfg.agile.app.project_service.service.CategoryService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/projects/{projectId}/categories")
public class CategoryController {

    private final CategoryService categoryService;

    public CategoryController(CategoryService categoryService) {
        this.categoryService = categoryService;
    }

    @PostMapping
    public ResponseEntity<CategoryResponseDto> create(
            @PathVariable UUID projectId,
            @Valid @RequestBody CreateCategoryRequestDto dto,
            @AuthenticationPrincipal UUID callerId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(categoryService.create(projectId, dto, callerId));
    }

    @GetMapping
    public List<CategoryResponseDto> listByProject(@PathVariable UUID projectId,
                                                   @AuthenticationPrincipal UUID callerId) {
        return categoryService.findByProject(projectId, callerId);
    }

    @PutMapping("/{categoryId}")
    public CategoryResponseDto update(@PathVariable UUID projectId,
                                      @PathVariable UUID categoryId,
                                      @Valid @RequestBody UpdateCategoryRequestDto dto,
                                      @AuthenticationPrincipal UUID callerId) {
        return categoryService.update(categoryId, dto, callerId);
    }

    @DeleteMapping("/{categoryId}")
    public ResponseEntity<Void> delete(@PathVariable UUID projectId,
                                       @PathVariable UUID categoryId,
                                       @AuthenticationPrincipal UUID callerId) {
        categoryService.delete(categoryId, callerId);
        return ResponseEntity.noContent().build();
    }
}