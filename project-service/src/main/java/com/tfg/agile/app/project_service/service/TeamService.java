package com.tfg.agile.app.project_service.service;

import com.tfg.agile.app.project_service.dto.*;
import com.tfg.agile.app.project_service.entity.*;
import com.tfg.agile.app.project_service.exception.ConflictException;
import com.tfg.agile.app.project_service.exception.ForbiddenException;
import com.tfg.agile.app.project_service.exception.ResourceNotFoundException;
import com.tfg.agile.app.project_service.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class TeamService {

    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;

    public TeamService(TeamRepository teamRepository,
                       TeamMemberRepository teamMemberRepository,
                       WorkspaceRepository workspaceRepository,
                       WorkspaceMemberRepository workspaceMemberRepository) {
        this.teamRepository = teamRepository;
        this.teamMemberRepository = teamMemberRepository;
        this.workspaceRepository = workspaceRepository;
        this.workspaceMemberRepository = workspaceMemberRepository;
    }

    @Transactional
    public TeamResponseDto create(UUID workspaceId, CreateTeamRequestDto dto, UUID callerId) {
        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace not found"));
        requireWorkspaceMember(workspaceId, callerId);

        Team team = Team.builder()
                .workspace(workspace)
                .name(dto.name())
                .description(dto.description())
                .build();
        return TeamResponseDto.from(teamRepository.save(team));
    }

    @Transactional(readOnly = true)
    public List<TeamResponseDto> findByWorkspace(UUID workspaceId, UUID callerId) {
        workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace not found"));
        requireWorkspaceMember(workspaceId, callerId);
        return teamRepository.findByWorkspaceId(workspaceId).stream()
                .map(TeamResponseDto::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public TeamResponseDto findById(UUID teamId, UUID callerId) {
        Team team = getTeamOrThrow(teamId);
        requireWorkspaceMember(team.getWorkspace().getId(), callerId);
        return TeamResponseDto.from(team);
    }

    @Transactional
    public TeamResponseDto update(UUID teamId, UpdateTeamRequestDto dto, UUID callerId) {
        Team team = getTeamOrThrow(teamId);
        requireWorkspaceAdmin(team.getWorkspace().getId(), callerId);
        team.setName(dto.name());
        team.setDescription(dto.description());
        return TeamResponseDto.from(teamRepository.save(team));
    }

    @Transactional
    public void delete(UUID teamId, UUID callerId) {
        Team team = getTeamOrThrow(teamId);
        requireWorkspaceAdmin(team.getWorkspace().getId(), callerId);
        teamRepository.deleteById(teamId);
    }

    @Transactional(readOnly = true)
    public List<TeamMemberResponseDto> getMembers(UUID teamId, UUID callerId) {
        Team team = getTeamOrThrow(teamId);
        requireWorkspaceMember(team.getWorkspace().getId(), callerId);
        return teamMemberRepository.findByTeamId(teamId).stream()
                .map(TeamMemberResponseDto::from)
                .toList();
    }

    @Transactional
    public TeamMemberResponseDto addMember(UUID teamId, UUID targetUserId, UUID callerId) {
        Team team = getTeamOrThrow(teamId);
        requireWorkspaceAdmin(team.getWorkspace().getId(), callerId);
        if (teamMemberRepository.existsByTeamIdAndUserId(teamId, targetUserId)) {
            throw new ConflictException("User is already a member of this team");
        }
        TeamMember member = TeamMember.builder()
                .team(team)
                .userId(targetUserId)
                .build();
        return TeamMemberResponseDto.from(teamMemberRepository.save(member));
    }

    @Transactional
    public void removeMember(UUID teamId, UUID targetUserId, UUID callerId) {
        Team team = getTeamOrThrow(teamId);
        requireWorkspaceAdmin(team.getWorkspace().getId(), callerId);
        TeamMember member = teamMemberRepository.findByTeamIdAndUserId(teamId, targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Member not found"));
        teamMemberRepository.delete(member);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private Team getTeamOrThrow(UUID id) {
        return teamRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found"));
    }

    private void requireWorkspaceMember(UUID workspaceId, UUID userId) {
        if (!workspaceMemberRepository.existsByWorkspaceIdAndUserId(workspaceId, userId)) {
            throw new ForbiddenException("Not a member of this workspace");
        }
    }

    private void requireWorkspaceAdmin(UUID workspaceId, UUID userId) {
        if (!workspaceMemberRepository.existsByWorkspaceIdAndUserIdAndRole(workspaceId, userId, WorkspaceRole.ADMIN)) {
            throw new ForbiddenException("Workspace admin role required");
        }
    }
}