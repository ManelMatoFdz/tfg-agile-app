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
@RequestMapping("/workspaces/{workspaceId}/categories")
public class CategoryController {

    private final CategoryService categoryService;

    public CategoryController(CategoryService categoryService) {
        this.categoryService = categoryService;
    }

    @PostMapping
    public ResponseEntity<CategoryResponseDto> create(
            @PathVariable("workspaceId") UUID workspaceId,
            @Valid @RequestBody CreateCategoryRequestDto dto,
            @AuthenticationPrincipal UUID callerId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(categoryService.create(workspaceId, dto, callerId));
    }

    @GetMapping
    public List<CategoryResponseDto> listByWorkspace(@PathVariable("workspaceId") UUID workspaceId,
                                                     @AuthenticationPrincipal UUID callerId) {
        return categoryService.findByWorkspace(workspaceId, callerId);
    }

    @PutMapping("/{categoryId}")
    public CategoryResponseDto update(@PathVariable("workspaceId") UUID workspaceId,
                                      @PathVariable("categoryId") UUID categoryId,
                                      @Valid @RequestBody UpdateCategoryRequestDto dto,
                                      @AuthenticationPrincipal UUID callerId) {
        return categoryService.update(workspaceId, categoryId, dto, callerId);
    }

    @DeleteMapping("/{categoryId}")
    public ResponseEntity<Void> delete(@PathVariable("workspaceId") UUID workspaceId,
                                       @PathVariable("categoryId") UUID categoryId,
                                       @AuthenticationPrincipal UUID callerId) {
        categoryService.delete(workspaceId, categoryId, callerId);
        return ResponseEntity.noContent().build();
    }
}