package com.tfg.agile.app.project_service.service;

import com.tfg.agile.app.project_service.dto.*;
import com.tfg.agile.app.project_service.entity.*;
import com.tfg.agile.app.project_service.exception.ConflictException;
import com.tfg.agile.app.project_service.exception.ForbiddenException;
import com.tfg.agile.app.project_service.exception.ResourceNotFoundException;
import com.tfg.agile.app.project_service.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class TeamService {

    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final ProjectRepository projectRepository;

    public TeamService(TeamRepository teamRepository,
                       TeamMemberRepository teamMemberRepository,
                       WorkspaceRepository workspaceRepository,
                       WorkspaceMemberRepository workspaceMemberRepository,
                       ProjectRepository projectRepository) {
        this.teamRepository = teamRepository;
        this.teamMemberRepository = teamMemberRepository;
        this.workspaceRepository = workspaceRepository;
        this.workspaceMemberRepository = workspaceMemberRepository;
        this.projectRepository = projectRepository;
    }

    @Transactional
    public TeamResponseDto create(UUID workspaceId, CreateTeamRequestDto dto, UUID callerId) {
        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("WORKSPACE_NOT_FOUND"));
        requireWorkspaceMember(workspaceId, callerId);

        Team team = Team.builder()
                .workspace(workspace)
                .name(dto.name())
                .description(dto.description())
                .build();
        teamRepository.save(team);

        TeamMember creator = TeamMember.builder()
                .team(team)
                .userId(callerId)
                .role(TeamRole.ADMIN)
                .build();
        teamMemberRepository.save(creator);

        return TeamResponseDto.from(team);
    }

    @Transactional(readOnly = true)
    public List<TeamResponseDto> findByWorkspace(UUID workspaceId, UUID callerId) {
        workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("WORKSPACE_NOT_FOUND"));
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
        requireTeamAdminOrWorkspaceAdmin(teamId, team.getWorkspace().getId(), callerId);
        team.setName(dto.name());
        team.setDescription(dto.description());
        return TeamResponseDto.from(teamRepository.save(team));
    }

    @Transactional
    public void delete(UUID teamId, UUID callerId) {
        Team team = getTeamOrThrow(teamId);
        requireTeamAdminOrWorkspaceAdmin(teamId, team.getWorkspace().getId(), callerId);

        // Unlink projects before deleting the team
        for (Project project : projectRepository.findByTeamId(teamId)) {
            project.setTeam(null);
            projectRepository.save(project);
        }

        teamMemberRepository.deleteByTeamId(teamId);
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
        requireTeamAdminOrWorkspaceAdmin(teamId, team.getWorkspace().getId(), callerId);
        if (teamMemberRepository.existsByTeamIdAndUserId(teamId, targetUserId)) {
            throw new ConflictException("ALREADY_TEAM_MEMBER");
        }
        TeamMember member = TeamMember.builder()
                .team(team)
                .userId(targetUserId)
                .role(TeamRole.MEMBER)
                .build();
        return TeamMemberResponseDto.from(teamMemberRepository.save(member));
    }

    @Transactional
    public void removeMember(UUID teamId, UUID targetUserId, UUID callerId) {
        Team team = getTeamOrThrow(teamId);
        requireTeamAdminOrWorkspaceAdmin(teamId, team.getWorkspace().getId(), callerId);
        TeamMember member = teamMemberRepository.findByTeamIdAndUserId(teamId, targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("MEMBER_NOT_FOUND"));
        teamMemberRepository.delete(member);
    }

    @Transactional
    public void leaveTeam(UUID teamId, UUID callerId) {
        getTeamOrThrow(teamId);
        TeamMember member = teamMemberRepository.findByTeamIdAndUserId(teamId, callerId)
                .orElseThrow(() -> new ResourceNotFoundException("MEMBER_NOT_FOUND"));
        if (member.getRole() == TeamRole.ADMIN) {
            long adminCount = teamMemberRepository.findByTeamId(teamId).stream()
                    .filter(m -> m.getRole() == TeamRole.ADMIN)
                    .count();
            if (adminCount <= 1) {
                throw new ConflictException("LAST_TEAM_ADMIN");
            }
        }
        teamMemberRepository.delete(member);
    }

    @Transactional
    public TeamMemberResponseDto updateMemberRole(UUID teamId, UUID targetUserId, UpdateTeamMemberRoleRequestDto dto, UUID callerId) {
        Team team = getTeamOrThrow(teamId);
        requireTeamAdminOrWorkspaceAdmin(teamId, team.getWorkspace().getId(), callerId);
        TeamMember member = teamMemberRepository.findByTeamIdAndUserId(teamId, targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("MEMBER_NOT_FOUND"));
        if (member.getRole() == TeamRole.ADMIN && dto.role() == TeamRole.MEMBER) {
            long adminCount = teamMemberRepository.findByTeamId(teamId).stream()
                    .filter(m -> m.getRole() == TeamRole.ADMIN)
                    .count();
            if (adminCount <= 1) {
                throw new ConflictException("LAST_TEAM_ADMIN");
            }
        }
        member.setRole(dto.role());
        return TeamMemberResponseDto.from(teamMemberRepository.save(member));
    }

    @Transactional
    public TeamMemberResponseDto updateScrumRole(UUID teamId, UUID targetUserId, UpdateScrumRoleRequestDto dto, UUID callerId) {
        Team team = getTeamOrThrow(teamId);
        requireTeamAdminOrWorkspaceAdmin(teamId, team.getWorkspace().getId(), callerId);
        TeamMember member = teamMemberRepository.findByTeamIdAndUserId(teamId, targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("MEMBER_NOT_FOUND"));
        String rawRole = dto != null ? dto.scrumRole() : null;
        member.setScrumRole(rawRole == null || rawRole.isBlank()
                ? null
                : ScrumRole.valueOf(rawRole.toUpperCase()));
        return TeamMemberResponseDto.from(teamMemberRepository.save(member));
    }

    @Transactional
    public void touchMemberActivity(UUID teamId, UUID userId) {
        teamMemberRepository.findByTeamIdAndUserId(teamId, userId)
                .ifPresent(member -> {
                    member.setLastActiveAt(Instant.now());
                    teamMemberRepository.save(member);
                });
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private Team getTeamOrThrow(UUID id) {
        return teamRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("TEAM_NOT_FOUND"));
    }

    private void requireWorkspaceMember(UUID workspaceId, UUID userId) {
        if (!workspaceMemberRepository.existsByWorkspaceIdAndUserId(workspaceId, userId)) {
            throw new ForbiddenException("NOT_WORKSPACE_MEMBER");
        }
    }

    private boolean isWorkspaceAdmin(UUID workspaceId, UUID userId) {
        return workspaceMemberRepository.existsByWorkspaceIdAndUserIdAndRole(workspaceId, userId, WorkspaceRole.ADMIN);
    }

    private boolean isTeamAdmin(UUID teamId, UUID userId) {
        return teamMemberRepository.findByTeamIdAndUserId(teamId, userId)
                .map(m -> m.getRole() == TeamRole.ADMIN)
                .orElse(false);
    }

    private void requireTeamAdminOrWorkspaceAdmin(UUID teamId, UUID workspaceId, UUID userId) {
        if (!isTeamAdmin(teamId, userId) && !isWorkspaceAdmin(workspaceId, userId)) {
            throw new ForbiddenException("TEAM_ADMIN_REQUIRED");
        }
    }
}