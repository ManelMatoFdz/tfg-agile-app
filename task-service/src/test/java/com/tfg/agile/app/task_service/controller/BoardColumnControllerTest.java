package com.tfg.agile.app.task_service.controller;

import com.tfg.agile.app.task_service.client.ProjectServiceClient;
import com.tfg.agile.app.task_service.dto.BoardColumnDto;
import com.tfg.agile.app.task_service.dto.SaveBoardColumnsRequestDto;
import com.tfg.agile.app.task_service.exception.ForbiddenException;
import com.tfg.agile.app.task_service.service.BoardColumnService;
import com.tfg.agile.app.task_service.support.TestDataFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BoardColumnControllerTest {

    @Mock
    private BoardColumnService boardColumnService;
    @Mock
    private ProjectServiceClient projectServiceClient;

    private BoardColumnController controller;

    @BeforeEach
    void setUp() {
        controller = new BoardColumnController(boardColumnService, projectServiceClient);
    }

    @Test
    void getColumns_delegatesToService() {
        UUID projectId = UUID.randomUUID();
        UUID callerId = UUID.randomUUID();

        BoardColumnDto dto = new BoardColumnDto(UUID.randomUUID(), "TODO", 0, "#6B7280", null, false);
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.memberPermissions());
        when(boardColumnService.getColumns(projectId)).thenReturn(List.of(dto));

        var result = controller.getColumns(projectId, callerId);

        assertThat(result).hasSize(1);
        verify(projectServiceClient).getMemberPermissions(projectId, callerId);
    }

    @Test
    void saveColumns_adminCanSave() {
        UUID projectId = UUID.randomUUID();
        UUID callerId = UUID.randomUUID();

        BoardColumnDto doneCol = new BoardColumnDto(null, "DONE", 0, "#22C55E", null, true);
        SaveBoardColumnsRequestDto request = new SaveBoardColumnsRequestDto(List.of(doneCol));

        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.adminPermissions());
        when(boardColumnService.saveColumns(projectId, request.columns())).thenReturn(List.of(doneCol));

        var result = controller.saveColumns(projectId, request, callerId);

        assertThat(result).hasSize(1);
        verify(boardColumnService).saveColumns(projectId, request.columns());
    }

    @Test
    void saveColumns_scrumMasterCanSave() {
        UUID projectId = UUID.randomUUID();
        UUID callerId = UUID.randomUUID();

        BoardColumnDto doneCol = new BoardColumnDto(null, "DONE", 0, "#22C55E", null, true);
        SaveBoardColumnsRequestDto request = new SaveBoardColumnsRequestDto(List.of(doneCol));

        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.scrumMasterPermissions());
        when(boardColumnService.saveColumns(projectId, request.columns())).thenReturn(List.of(doneCol));

        var result = controller.saveColumns(projectId, request, callerId);

        assertThat(result).hasSize(1);
    }

    @Test
    void saveColumns_throwsWhenNotAdminNorSM() {
        UUID projectId = UUID.randomUUID();
        UUID callerId = UUID.randomUUID();

        BoardColumnDto doneCol = new BoardColumnDto(null, "DONE", 0, "#22C55E", null, true);
        SaveBoardColumnsRequestDto request = new SaveBoardColumnsRequestDto(List.of(doneCol));

        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.memberPermissions());

        assertThatThrownBy(() -> controller.saveColumns(projectId, request, callerId))
                .isInstanceOf(ForbiddenException.class)
                .hasMessage("ONLY_ADMIN_OR_SM_CAN_CONFIGURE_BOARD");
    }
}