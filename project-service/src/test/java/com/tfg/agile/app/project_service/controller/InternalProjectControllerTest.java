package com.tfg.agile.app.project_service.controller;

import com.tfg.agile.app.project_service.dto.MemberPermissionsDto;
import com.tfg.agile.app.project_service.entity.ProjectRole;
import com.tfg.agile.app.project_service.entity.ScrumRole;
import com.tfg.agile.app.project_service.service.ProjectService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
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
        MemberPermissionsDto dto = new MemberPermissionsDto(ProjectRole.ADMIN, ScrumRole.SCRUM_MASTER);

        when(projectService.getMemberPermissions(projectId, userId)).thenReturn(dto);

        MemberPermissionsDto response = controller.getMemberPermissions(projectId, userId);

        assertThat(response).isEqualTo(dto);
    }
}

