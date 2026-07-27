package com.tfg.agile.app.project_service.controller;

import com.tfg.agile.app.project_service.dto.MemberPermissionsDto;
import com.tfg.agile.app.project_service.dto.ProjectMemberIdsDto;
import com.tfg.agile.app.project_service.entity.ScrumRole;
import com.tfg.agile.app.project_service.service.ProjectService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InternalProjectControllerTest {

    @Mock
    private ProjectService projectService;

    @Test
    void getMemberPermissions_delegatesToService() {
        InternalProjectController controller = new InternalProjectController(projectService);
        UUID projectId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        MemberPermissionsDto dto = new MemberPermissionsDto(UUID.randomUUID(), true, false, ScrumRole.SCRUM_MASTER);

        when(projectService.getMemberPermissions(projectId, userId)).thenReturn(dto);

        MemberPermissionsDto response = controller.getMemberPermissions(projectId, userId);

        assertThat(response).isEqualTo(dto);
    }

    @Test
    void touchProject_delegatesToService() {
        InternalProjectController controller = new InternalProjectController(projectService);
        UUID projectId = UUID.randomUUID();

        var response = controller.touchProject(projectId);

        assertThat(response.getStatusCode().value()).isEqualTo(204);
        verify(projectService).touchUpdatedAt(projectId);
    }

    @Test
    void getMemberIds_delegatesToService() {
        InternalProjectController controller = new InternalProjectController(projectService);
        UUID projectId = UUID.randomUUID();
        ProjectMemberIdsDto dto = new ProjectMemberIdsDto(UUID.randomUUID(), List.of(UUID.randomUUID()));

        when(projectService.getMemberIds(projectId)).thenReturn(dto);

        ProjectMemberIdsDto response = controller.getMemberIds(projectId);

        assertThat(response).isEqualTo(dto);
    }

    @Test
    void touchMemberActivity_delegatesToService() {
        InternalProjectController controller = new InternalProjectController(projectService);
        UUID projectId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        var response = controller.touchMemberActivity(projectId, userId);

        assertThat(response.getStatusCode().value()).isEqualTo(204);
        verify(projectService).touchMemberActivity(projectId, userId);
    }
}