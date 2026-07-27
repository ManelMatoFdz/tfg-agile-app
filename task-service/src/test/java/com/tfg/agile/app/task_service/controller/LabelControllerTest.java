package com.tfg.agile.app.task_service.controller;

import com.tfg.agile.app.task_service.dto.CreateLabelRequestDto;
import com.tfg.agile.app.task_service.dto.LabelDto;
import com.tfg.agile.app.task_service.dto.UpdateLabelRequestDto;
import com.tfg.agile.app.task_service.service.LabelService;
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
class LabelControllerTest {

    @Mock
    private LabelService labelService;

    @Test
    void listByProject_delegatesToService() {
        LabelController controller = new LabelController(labelService);
        UUID projectId = UUID.randomUUID();
        UUID callerId = UUID.randomUUID();

        LabelDto dto = new LabelDto(UUID.randomUUID(), "Bug", "#FF0000");
        when(labelService.findByProject(projectId, callerId)).thenReturn(List.of(dto));

        assertThat(controller.listByProject(projectId, callerId)).hasSize(1);
    }

    @Test
    void create_delegatesToServiceAndReturnsCreated() {
        LabelController controller = new LabelController(labelService);
        UUID projectId = UUID.randomUUID();
        UUID callerId = UUID.randomUUID();
        CreateLabelRequestDto request = new CreateLabelRequestDto("Feature", "#00FF00");

        LabelDto dto = new LabelDto(UUID.randomUUID(), "Feature", "#00FF00");
        when(labelService.create(projectId, request, callerId)).thenReturn(dto);

        var response = controller.create(projectId, request, callerId);

        assertThat(response.getStatusCode().value()).isEqualTo(201);
        assertThat(response.getBody()).isEqualTo(dto);
    }

    @Test
    void update_delegatesToService() {
        LabelController controller = new LabelController(labelService);
        UUID labelId = UUID.randomUUID();
        UUID callerId = UUID.randomUUID();
        UpdateLabelRequestDto request = new UpdateLabelRequestDto("Updated", "#FFFFFF");

        LabelDto dto = new LabelDto(labelId, "Updated", "#FFFFFF");
        when(labelService.update(labelId, request, callerId)).thenReturn(dto);

        assertThat(controller.update(labelId, request, callerId)).isEqualTo(dto);
    }

    @Test
    void delete_delegatesToServiceAndReturnsNoContent() {
        LabelController controller = new LabelController(labelService);
        UUID labelId = UUID.randomUUID();
        UUID callerId = UUID.randomUUID();

        var response = controller.delete(labelId, callerId);

        assertThat(response.getStatusCode().value()).isEqualTo(204);
        verify(labelService).delete(labelId, callerId);
    }
}