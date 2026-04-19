package com.tfg.agile.app.project_service.service;

import com.tfg.agile.app.project_service.dto.AddMemberRequestDto;
import com.tfg.agile.app.project_service.dto.CreateWorkspaceRequestDto;
import com.tfg.agile.app.project_service.dto.UpdateMemberRoleRequestDto;
import com.tfg.agile.app.project_service.dto.UpdateWorkspaceRequestDto;
import com.tfg.agile.app.project_service.entity.Workspace;
import com.tfg.agile.app.project_service.entity.WorkspaceMember;
import com.tfg.agile.app.project_service.entity.WorkspaceRole;
import com.tfg.agile.app.project_service.exception.ConflictException;
import com.tfg.agile.app.project_service.exception.ForbiddenException;
import com.tfg.agile.app.project_service.exception.ResourceNotFoundException;
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
class WorkspaceServiceTest {

    @Mock
    private WorkspaceRepository workspaceRepository;
    @Mock
    private WorkspaceMemberRepository memberRepository;

    private WorkspaceService service;

    @BeforeEach
    void setUp() {
        service = new WorkspaceService(workspaceRepository, memberRepository);
    }

    @Test
    void create_persistsWorkspaceAndAdminMembership() {
        UUID callerId = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();

        when(workspaceRepository.save(any(Workspace.class))).thenReturn(workspace);
        when(memberRepository.save(any(WorkspaceMember.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = service.create(new CreateWorkspaceRequestDto("Acme", "Main workspace"), callerId);

        assertThat(response.name()).isEqualTo("Acme");
        assertThat(response.ownerId()).isEqualTo(callerId);
        verify(workspaceRepository).save(any(Workspace.class));
        verify(memberRepository).save(any(WorkspaceMember.class));
    }

    @Test
    void findAllByUser_mapsMemberWorkspaces() {
        UUID userId = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        WorkspaceMember member = TestDataFactory.workspaceMember(workspace, userId, WorkspaceRole.MEMBER);

        when(memberRepository.findByUserId(userId)).thenReturn(List.of(member));

        var result = service.findAllByUser(userId);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).id()).isEqualTo(workspace.getId());
    }

    @Test
    void findById_requiresMembership() {
        UUID callerId = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();

        when(workspaceRepository.findById(workspace.getId())).thenReturn(Optional.of(workspace));
        when(memberRepository.existsByWorkspaceIdAndUserId(workspace.getId(), callerId)).thenReturn(false);

        assertThatThrownBy(() -> service.findById(workspace.getId(), callerId))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void update_requiresAdminAndSavesWorkspace() {
        UUID callerId = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();

        when(workspaceRepository.findById(workspace.getId())).thenReturn(Optional.of(workspace));
        when(memberRepository.existsByWorkspaceIdAndUserIdAndRole(workspace.getId(), callerId, WorkspaceRole.ADMIN)).thenReturn(true);
        when(workspaceRepository.save(workspace)).thenReturn(workspace);

        var response = service.update(workspace.getId(), new UpdateWorkspaceRequestDto("Updated", "Desc"), callerId);

        assertThat(response.name()).isEqualTo("Updated");
        verify(workspaceRepository).save(workspace);
    }

    @Test
    void addMember_throwsConflictWhenAlreadyMember() {
        UUID workspaceId = UUID.randomUUID();
        UUID callerId = UUID.randomUUID();
        UUID targetUserId = UUID.randomUUID();

        when(workspaceRepository.findById(workspaceId)).thenReturn(Optional.of(TestDataFactory.workspace()));
        when(memberRepository.existsByWorkspaceIdAndUserIdAndRole(workspaceId, callerId, WorkspaceRole.ADMIN)).thenReturn(true);
        when(memberRepository.existsByWorkspaceIdAndUserId(workspaceId, targetUserId)).thenReturn(true);

        assertThatThrownBy(() -> service.addMember(workspaceId, new AddMemberRequestDto(targetUserId, "member"), callerId))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void removeMember_deletesExistingMember() {
        UUID workspaceId = UUID.randomUUID();
        UUID callerId = UUID.randomUUID();
        UUID targetUserId = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        WorkspaceMember member = TestDataFactory.workspaceMember(workspace, targetUserId, WorkspaceRole.MEMBER);

        when(workspaceRepository.findById(workspaceId)).thenReturn(Optional.of(workspace));
        when(memberRepository.existsByWorkspaceIdAndUserIdAndRole(workspaceId, callerId, WorkspaceRole.ADMIN)).thenReturn(true);
        when(memberRepository.findByWorkspaceIdAndUserId(workspaceId, targetUserId)).thenReturn(Optional.of(member));

        service.removeMember(workspaceId, targetUserId, callerId);

        verify(memberRepository).delete(member);
    }

    @Test
    void updateMemberRole_throwsWhenMemberDoesNotExist() {
        UUID workspaceId = UUID.randomUUID();
        UUID callerId = UUID.randomUUID();
        UUID targetUserId = UUID.randomUUID();

        when(workspaceRepository.findById(workspaceId)).thenReturn(Optional.of(TestDataFactory.workspace()));
        when(memberRepository.existsByWorkspaceIdAndUserIdAndRole(workspaceId, callerId, WorkspaceRole.ADMIN)).thenReturn(true);
        when(memberRepository.findByWorkspaceIdAndUserId(workspaceId, targetUserId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.updateMemberRole(workspaceId, targetUserId, new UpdateMemberRoleRequestDto("admin"), callerId))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void findById_returnsWorkspaceForMember() {
        UUID callerId = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();

        when(workspaceRepository.findById(workspace.getId())).thenReturn(Optional.of(workspace));
        when(memberRepository.existsByWorkspaceIdAndUserId(workspace.getId(), callerId)).thenReturn(true);

        var result = service.findById(workspace.getId(), callerId);

        assertThat(result.id()).isEqualTo(workspace.getId());
    }

    @Test
    void delete_removesWorkspaceWhenCallerIsAdmin() {
        UUID callerId = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();

        when(workspaceRepository.findById(workspace.getId())).thenReturn(Optional.of(workspace));
        when(memberRepository.existsByWorkspaceIdAndUserIdAndRole(workspace.getId(), callerId, WorkspaceRole.ADMIN)).thenReturn(true);

        service.delete(workspace.getId(), callerId);

        verify(workspaceRepository).deleteById(workspace.getId());
    }

    @Test
    void getMembers_returnsWorkspaceMembersForCaller() {
        UUID callerId = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        WorkspaceMember member = TestDataFactory.workspaceMember(workspace, UUID.randomUUID(), WorkspaceRole.MEMBER);

        when(workspaceRepository.findById(workspace.getId())).thenReturn(Optional.of(workspace));
        when(memberRepository.existsByWorkspaceIdAndUserId(workspace.getId(), callerId)).thenReturn(true);
        when(memberRepository.findByWorkspaceId(workspace.getId())).thenReturn(List.of(member));

        var result = service.getMembers(workspace.getId(), callerId);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).userId()).isEqualTo(member.getUserId());
    }

    @Test
    void addMember_createsWorkspaceMemberWithResolvedRole() {
        UUID callerId = UUID.randomUUID();
        UUID targetUserId = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        WorkspaceMember savedMember = TestDataFactory.workspaceMember(workspace, targetUserId, WorkspaceRole.MEMBER);

        when(workspaceRepository.findById(workspace.getId())).thenReturn(Optional.of(workspace));
        when(memberRepository.existsByWorkspaceIdAndUserIdAndRole(workspace.getId(), callerId, WorkspaceRole.ADMIN)).thenReturn(true);
        when(memberRepository.existsByWorkspaceIdAndUserId(workspace.getId(), targetUserId)).thenReturn(false);
        when(workspaceRepository.getReferenceById(workspace.getId())).thenReturn(workspace);
        when(memberRepository.save(any(WorkspaceMember.class))).thenReturn(savedMember);

        var response = service.addMember(workspace.getId(), new AddMemberRequestDto(targetUserId, "member"), callerId);

        assertThat(response.userId()).isEqualTo(targetUserId);
        assertThat(response.role()).isEqualTo(WorkspaceRole.MEMBER);
    }

    @Test
    void findById_throwsWhenWorkspaceDoesNotExist() {
        UUID workspaceId = UUID.randomUUID();

        when(workspaceRepository.findById(workspaceId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.findById(workspaceId, UUID.randomUUID()))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void updateMemberRole_updatesRoleWhenMemberExists() {
        UUID workspaceId = UUID.randomUUID();
        UUID callerId = UUID.randomUUID();
        UUID targetUserId = UUID.randomUUID();
        Workspace workspace = TestDataFactory.workspace();
        WorkspaceMember member = TestDataFactory.workspaceMember(workspace, targetUserId, WorkspaceRole.MEMBER);

        when(workspaceRepository.findById(workspaceId)).thenReturn(Optional.of(workspace));
        when(memberRepository.existsByWorkspaceIdAndUserIdAndRole(workspaceId, callerId, WorkspaceRole.ADMIN)).thenReturn(true);
        when(memberRepository.findByWorkspaceIdAndUserId(workspaceId, targetUserId)).thenReturn(Optional.of(member));
        when(memberRepository.save(member)).thenReturn(member);

        var response = service.updateMemberRole(workspaceId, targetUserId, new UpdateMemberRoleRequestDto("admin"), callerId);

        assertThat(response.role()).isEqualTo(WorkspaceRole.ADMIN);
    }
}
