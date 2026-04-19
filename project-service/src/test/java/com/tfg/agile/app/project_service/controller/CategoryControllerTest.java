package com.tfg.agile.app.project_service.controller;

import com.tfg.agile.app.project_service.dto.CategoryResponseDto;
import com.tfg.agile.app.project_service.dto.CreateCategoryRequestDto;
import com.tfg.agile.app.project_service.dto.UpdateCategoryRequestDto;
import com.tfg.agile.app.project_service.service.CategoryService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CategoryControllerTest {

    @Mock
    private CategoryService categoryService;

    @Test
    void endpoints_delegateToCategoryService() {
        CategoryController controller = new CategoryController(categoryService);
        UUID workspaceId = UUID.randomUUID();
        UUID categoryId = UUID.randomUUID();
        UUID callerId = UUID.randomUUID();

        CreateCategoryRequestDto createRequest = new CreateCategoryRequestDto("Backend", "#112233", 1);
        UpdateCategoryRequestDto updateRequest = new UpdateCategoryRequestDto("Frontend", "#445566", 2);
        CategoryResponseDto response = new CategoryResponseDto(categoryId, workspaceId, "Backend", "#112233", 1, Instant.now());

        when(categoryService.create(workspaceId, createRequest, callerId)).thenReturn(response);
        when(categoryService.findByWorkspace(workspaceId, callerId)).thenReturn(List.of(response));
        when(categoryService.update(workspaceId, categoryId, updateRequest, callerId)).thenReturn(response);

        assertThat(controller.create(workspaceId, createRequest, callerId).getStatusCode().value()).isEqualTo(201);
        assertThat(controller.listByWorkspace(workspaceId, callerId)).hasSize(1);
        assertThat(controller.update(workspaceId, categoryId, updateRequest, callerId)).isEqualTo(response);
        assertThat(controller.delete(workspaceId, categoryId, callerId).getStatusCode().value()).isEqualTo(204);

        verify(categoryService).delete(workspaceId, categoryId, callerId);
    }
}

