package com.tfg.agile.app.project_service.service;

import com.tfg.agile.app.project_service.dto.CreateCategoryRequestDto;
import com.tfg.agile.app.project_service.dto.UpdateCategoryRequestDto;
import com.tfg.agile.app.project_service.entity.Category;
import com.tfg.agile.app.project_service.entity.Workspace;
import com.tfg.agile.app.project_service.entity.WorkspaceRole;
import com.tfg.agile.app.project_service.exception.ForbiddenException;
import com.tfg.agile.app.project_service.exception.ResourceNotFoundException;
import com.tfg.agile.app.project_service.repository.CategoryRepository;
import com.tfg.agile.app.project_service.repository.WorkspaceMemberRepository;
import com.tfg.agile.app.project_service.repository.WorkspaceRepository;
import com.tfg.agile.app.project_service.support.TestDataFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CategoryServiceTest {

    @Mock
    private CategoryRepository categoryRepository;
    @Mock
    private WorkspaceRepository workspaceRepository;
    @Mock
    private WorkspaceMemberRepository workspaceMemberRepository;

    private CategoryService service;

    @BeforeEach
    void setUp() {
        service = new CategoryService(categoryRepository, workspaceRepository, workspaceMemberRepository);
    }

    @Test
    void create_requiresWorkspaceAdmin() {
        UUID callerId = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();

        when(workspaceRepository.findById(workspace.getId())).thenReturn(Optional.of(workspace));
        when(workspaceMemberRepository.existsByWorkspaceIdAndUserIdAndRole(workspace.getId(), callerId, WorkspaceRole.ADMIN)).thenReturn(false);

        assertThatThrownBy(() -> service.create(workspace.getId(), new CreateCategoryRequestDto("Backend", "#112233", 0), callerId))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void findByWorkspace_requiresMembership() {
        UUID callerId = UUID.randomUUID();
        UUID workspaceId = UUID.randomUUID();

        when(workspaceRepository.findById(workspaceId)).thenReturn(Optional.of(TestDataFactory.workspace()));
        when(workspaceMemberRepository.existsByWorkspaceIdAndUserId(workspaceId, callerId)).thenReturn(false);

        assertThatThrownBy(() -> service.findByWorkspace(workspaceId, callerId))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void findByWorkspace_returnsOrderedCategories() {
        UUID callerId = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        Category category = TestDataFactory.category(workspace);

        when(workspaceRepository.findById(workspace.getId())).thenReturn(Optional.of(workspace));
        when(workspaceMemberRepository.existsByWorkspaceIdAndUserId(workspace.getId(), callerId)).thenReturn(true);
        when(categoryRepository.findByWorkspaceIdOrderByPosition(workspace.getId())).thenReturn(List.of(category));

        var result = service.findByWorkspace(workspace.getId(), callerId);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).id()).isEqualTo(category.getId());
    }

    @Test
    void update_throwsWhenCategoryMissing() {
        UUID callerId = UUID.randomUUID();
        UUID workspaceId = UUID.randomUUID();
        UUID categoryId = UUID.randomUUID();

        when(workspaceMemberRepository.existsByWorkspaceIdAndUserIdAndRole(workspaceId, callerId, WorkspaceRole.ADMIN)).thenReturn(true);
        when(categoryRepository.findById(categoryId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.update(workspaceId, categoryId, new UpdateCategoryRequestDto("New", "#445566", 1), callerId))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void delete_removesCategoryWhenExists() {
        UUID callerId = UUID.randomUUID();
        UUID workspaceId = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        Category category = TestDataFactory.category(workspace);

        when(workspaceMemberRepository.existsByWorkspaceIdAndUserIdAndRole(workspaceId, callerId, WorkspaceRole.ADMIN)).thenReturn(true);
        when(categoryRepository.findById(category.getId())).thenReturn(Optional.of(category));

        service.delete(workspaceId, category.getId(), callerId);

        verify(categoryRepository).deleteById(category.getId());
    }

    @Test
    void create_persistsCategoryForWorkspaceAdmin() {
        UUID callerId = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        Category category = TestDataFactory.category(workspace);

        when(workspaceRepository.findById(workspace.getId())).thenReturn(Optional.of(workspace));
        when(workspaceMemberRepository.existsByWorkspaceIdAndUserIdAndRole(workspace.getId(), callerId, WorkspaceRole.ADMIN)).thenReturn(true);
        when(categoryRepository.save(any(Category.class))).thenReturn(category);

        var response = service.create(workspace.getId(), new CreateCategoryRequestDto("Backend", "#112233", 1), callerId);

        assertThat(response.id()).isEqualTo(category.getId());
    }

    @Test
    void update_savesCategoryWhenExists() {
        UUID callerId = UUID.randomUUID();
        UUID workspaceId = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        Category category = TestDataFactory.category(workspace);

        when(workspaceMemberRepository.existsByWorkspaceIdAndUserIdAndRole(workspaceId, callerId, WorkspaceRole.ADMIN)).thenReturn(true);
        when(categoryRepository.findById(category.getId())).thenReturn(Optional.of(category));
        when(categoryRepository.save(category)).thenReturn(category);

        var response = service.update(workspaceId, category.getId(), new UpdateCategoryRequestDto("Updated", "#445566", 4), callerId);

        assertThat(response.name()).isEqualTo("Updated");
        assertThat(response.position()).isEqualTo(4);
    }

    @Test
    void delete_throwsWhenCategoryMissing() {
        UUID callerId = UUID.randomUUID();
        UUID workspaceId = UUID.randomUUID();
        UUID categoryId = UUID.randomUUID();

        when(workspaceMemberRepository.existsByWorkspaceIdAndUserIdAndRole(workspaceId, callerId, WorkspaceRole.ADMIN)).thenReturn(true);
        when(categoryRepository.findById(categoryId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.delete(workspaceId, categoryId, callerId))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
