package com.tfg.agile.app.task_service.controller;

import com.tfg.agile.app.task_service.client.MemberPermissionsDto;
import com.tfg.agile.app.task_service.client.ProjectServiceClient;
import com.tfg.agile.app.task_service.dto.BoardColumnDto;
import com.tfg.agile.app.task_service.dto.SaveBoardColumnsRequestDto;
import com.tfg.agile.app.task_service.exception.ForbiddenException;
import com.tfg.agile.app.task_service.service.BoardColumnService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
public class BoardColumnController {

    private final BoardColumnService boardColumnService;
    private final ProjectServiceClient projectServiceClient;

    public BoardColumnController(BoardColumnService boardColumnService,
                                 ProjectServiceClient projectServiceClient) {
        this.boardColumnService = boardColumnService;
        this.projectServiceClient = projectServiceClient;
    }

    @GetMapping("/projects/{projectId}/board-columns")
    public List<BoardColumnDto> getColumns(@PathVariable("projectId") UUID projectId,
                                           @AuthenticationPrincipal UUID callerId) {
        projectServiceClient.getMemberPermissions(projectId, callerId);
        return boardColumnService.getColumns(projectId);
    }

    @PutMapping("/projects/{projectId}/board-columns")
    public List<BoardColumnDto> saveColumns(@PathVariable("projectId") UUID projectId,
                                            @Valid @RequestBody SaveBoardColumnsRequestDto dto,
                                            @AuthenticationPrincipal UUID callerId) {
        MemberPermissionsDto perms = projectServiceClient.getMemberPermissions(projectId, callerId);
        if (!isAdmin(perms) && !isScrumMaster(perms)) {
            throw new ForbiddenException("ONLY_ADMIN_OR_SM_CAN_CONFIGURE_BOARD");
        }
        return boardColumnService.saveColumns(projectId, dto.columns());
    }

    private boolean isAdmin(MemberPermissionsDto p) {
        return p.workspaceAdmin() || p.teamAdmin();
    }

    private boolean isScrumMaster(MemberPermissionsDto p) {
        return "SCRUM_MASTER".equals(p.scrumRole());
    }
}