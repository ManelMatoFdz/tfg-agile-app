package com.tfg.agile.app.project_service.controller;

import com.tfg.agile.app.project_service.dto.AddMemberRequestDto;
import com.tfg.agile.app.project_service.dto.CreateWorkspaceRequestDto;
import com.tfg.agile.app.project_service.dto.UpdateMemberRoleRequestDto;
import com.tfg.agile.app.project_service.dto.UpdateWorkspaceRequestDto;
import com.tfg.agile.app.project_service.dto.WorkspaceMemberResponseDto;
import com.tfg.agile.app.project_service.dto.WorkspaceResponseDto;
import com.tfg.agile.app.project_service.entity.WorkspaceRole;
import com.tfg.agile.app.project_service.service.WorkspaceService;
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
class WorkspaceControllerTest {

    @Mock
    private WorkspaceService workspaceService;

    @Test
    void endpoints_delegateToWorkspaceService() {
        WorkspaceController controller = new WorkspaceController(workspaceService);
        UUID workspaceId = UUID.randomUUID();
        UUID callerId = UUID.randomUUID();
        UUID targetUserId = UUID.randomUUID();

        CreateWorkspaceRequestDto createRequest = new CreateWorkspaceRequestDto("Workspace", "Desc");
        UpdateWorkspaceRequestDto updateRequest = new UpdateWorkspaceRequestDto("Workspace 2", "Desc 2");
        AddMemberRequestDto addMemberRequest = new AddMemberRequestDto(targetUserId, "member");
        UpdateMemberRoleRequestDto updateRoleRequest = new UpdateMemberRoleRequestDto("admin");

        WorkspaceResponseDto workspaceResponse = new WorkspaceResponseDto(workspaceId, "Workspace", "Desc", callerId, Instant.now(), Instant.now());
        WorkspaceMemberResponseDto memberResponse = new WorkspaceMemberResponseDto(UUID.randomUUID(), targetUserId, WorkspaceRole.MEMBER, Instant.now());

        when(workspaceService.create(createRequest, callerId)).thenReturn(workspaceResponse);
        when(workspaceService.findAllByUser(callerId)).thenReturn(List.of(workspaceResponse));
        when(workspaceService.findById(workspaceId, callerId)).thenReturn(workspaceResponse);
        when(workspaceService.update(workspaceId, updateRequest, callerId)).thenReturn(workspaceResponse);
        when(workspaceService.getMembers(workspaceId, callerId)).thenReturn(List.of(memberResponse));
        when(workspaceService.addMember(workspaceId, addMemberRequest, callerId)).thenReturn(memberResponse);
        when(workspaceService.updateMemberRole(workspaceId, targetUserId, updateRoleRequest, callerId)).thenReturn(memberResponse);

        assertThat(controller.create(createRequest, callerId).getStatusCode().value()).isEqualTo(201);
        assertThat(controller.listMine(callerId)).hasSize(1);
        assertThat(controller.getById(workspaceId, callerId)).isEqualTo(workspaceResponse);
        assertThat(controller.update(workspaceId, updateRequest, callerId)).isEqualTo(workspaceResponse);
        assertThat(controller.delete(workspaceId, callerId).getStatusCode().value()).isEqualTo(204);
        assertThat(controller.getMembers(workspaceId, callerId)).hasSize(1);
        assertThat(controller.addMember(workspaceId, addMemberRequest, callerId).getStatusCode().value()).isEqualTo(201);
        assertThat(controller.updateMemberRole(workspaceId, targetUserId, updateRoleRequest, callerId)).isEqualTo(memberResponse);
        assertThat(controller.removeMember(workspaceId, targetUserId, callerId).getStatusCode().value()).isEqualTo(204);

        verify(workspaceService).delete(workspaceId, callerId);
        verify(workspaceService).removeMember(workspaceId, targetUserId, callerId);
    }
}

