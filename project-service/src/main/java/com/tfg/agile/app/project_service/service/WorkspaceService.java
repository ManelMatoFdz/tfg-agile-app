package com.tfg.agile.app.project_service.service;

import com.tfg.agile.app.project_service.dto.*;
import com.tfg.agile.app.project_service.entity.*;
import com.tfg.agile.app.project_service.exception.ConflictException;
import com.tfg.agile.app.project_service.exception.ForbiddenException;
import com.tfg.agile.app.project_service.exception.ResourceNotFoundException;
import com.tfg.agile.app.project_service.repository.WorkspaceMemberRepository;
import com.tfg.agile.app.project_service.repository.WorkspaceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class WorkspaceService {

    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository memberRepository;

    public WorkspaceService(WorkspaceRepository workspaceRepository,
                            WorkspaceMemberRepository memberRepository) {
        this.workspaceRepository = workspaceRepository;
        this.memberRepository = memberRepository;
    }

    @Transactional
    public WorkspaceResponseDto create(CreateWorkspaceRequestDto dto, UUID callerId) {
        Workspace workspace = Workspace.builder()
                .name(dto.name())
                .description(dto.description())
                .ownerId(callerId)
                .build();
        workspaceRepository.save(workspace);

        WorkspaceMember member = WorkspaceMember.builder()
                .workspace(workspace)
                .userId(callerId)
                .role(WorkspaceRole.ADMIN)
                .build();
        memberRepository.save(member);

        return WorkspaceResponseDto.from(workspace);
    }

    @Transactional(readOnly = true)
    public List<WorkspaceResponseDto> findAllByUser(UUID userId) {
        return memberRepository.findByUserId(userId).stream()
                .map(m -> WorkspaceResponseDto.from(m.getWorkspace()))
                .toList();
    }

    @Transactional(readOnly = true)
    public WorkspaceResponseDto findById(UUID workspaceId, UUID callerId) {
        Workspace workspace = getWorkspaceOrThrow(workspaceId);
        requireMember(workspaceId, callerId);
        return WorkspaceResponseDto.from(workspace);
    }

    @Transactional
    public WorkspaceResponseDto update(UUID workspaceId, UpdateWorkspaceRequestDto dto, UUID callerId) {
        Workspace workspace = getWorkspaceOrThrow(workspaceId);
        requireAdmin(workspaceId, callerId);
        workspace.setName(dto.name());
        workspace.setDescription(dto.description());
        return WorkspaceResponseDto.from(workspaceRepository.save(workspace));
    }

    @Transactional
    public void delete(UUID workspaceId, UUID callerId) {
        getWorkspaceOrThrow(workspaceId);
        requireAdmin(workspaceId, callerId);
        workspaceRepository.deleteById(workspaceId);
    }

    @Transactional(readOnly = true)
    public List<WorkspaceMemberResponseDto> getMembers(UUID workspaceId, UUID callerId) {
        getWorkspaceOrThrow(workspaceId);
        requireMember(workspaceId, callerId);
        return memberRepository.findByWorkspaceId(workspaceId).stream()
                .map(WorkspaceMemberResponseDto::from)
                .toList();
    }

    @Transactional
    public WorkspaceMemberResponseDto addMember(UUID workspaceId, AddMemberRequestDto dto, UUID callerId) {
        getWorkspaceOrThrow(workspaceId);
        requireAdmin(workspaceId, callerId);
        if (memberRepository.existsByWorkspaceIdAndUserId(workspaceId, dto.userId())) {
            throw new ConflictException("User is already a member of this workspace");
        }
        WorkspaceRole role = WorkspaceRole.valueOf(dto.role().toUpperCase());
        WorkspaceMember member = WorkspaceMember.builder()
                .workspace(workspaceRepository.getReferenceById(workspaceId))
                .userId(dto.userId())
                .role(role)
                .build();
        return WorkspaceMemberResponseDto.from(memberRepository.save(member));
    }

    @Transactional
    public WorkspaceMemberResponseDto updateMemberRole(UUID workspaceId, UUID targetUserId,
                                                       UpdateMemberRoleRequestDto dto, UUID callerId) {
        getWorkspaceOrThrow(workspaceId);
        requireAdmin(workspaceId, callerId);
        WorkspaceMember member = memberRepository.findByWorkspaceIdAndUserId(workspaceId, targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Member not found"));
        member.setRole(WorkspaceRole.valueOf(dto.role().toUpperCase()));
        return WorkspaceMemberResponseDto.from(memberRepository.save(member));
    }

    @Transactional
    public void removeMember(UUID workspaceId, UUID targetUserId, UUID callerId) {
        getWorkspaceOrThrow(workspaceId);
        requireAdmin(workspaceId, callerId);
        WorkspaceMember member = memberRepository.findByWorkspaceIdAndUserId(workspaceId, targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Member not found"));
        memberRepository.delete(member);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private Workspace getWorkspaceOrThrow(UUID id) {
        return workspaceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace not found"));
    }

    private void requireMember(UUID workspaceId, UUID userId) {
        if (!memberRepository.existsByWorkspaceIdAndUserId(workspaceId, userId)) {
            throw new ForbiddenException("Not a member of this workspace");
        }
    }

    private void requireAdmin(UUID workspaceId, UUID userId) {
        if (!memberRepository.existsByWorkspaceIdAndUserIdAndRole(workspaceId, userId, WorkspaceRole.ADMIN)) {
            throw new ForbiddenException("Workspace admin role required");
        }
    }
}