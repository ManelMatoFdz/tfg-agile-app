package com.tfg.agile.app.project_service.service;

import com.tfg.agile.app.project_service.dto.*;
import com.tfg.agile.app.project_service.entity.*;
import com.tfg.agile.app.project_service.exception.ForbiddenException;
import com.tfg.agile.app.project_service.exception.ResourceNotFoundException;
import com.tfg.agile.app.project_service.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final CategoryRepository categoryRepository;

    public ProjectService(ProjectRepository projectRepository,
                          WorkspaceRepository workspaceRepository,
                          WorkspaceMemberRepository workspaceMemberRepository,
                          TeamRepository teamRepository,
                          TeamMemberRepository teamMemberRepository,
                          CategoryRepository categoryRepository) {
        this.projectRepository = projectRepository;
        this.workspaceRepository = workspaceRepository;
        this.workspaceMemberRepository = workspaceMemberRepository;
        this.teamRepository = teamRepository;
        this.teamMemberRepository = teamMemberRepository;
        this.categoryRepository = categoryRepository;
    }

    @Transactional
    public ProjectResponseDto create(UUID workspaceId, CreateProjectRequestDto dto, UUID callerId) {
        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("WORKSPACE_NOT_FOUND"));
        requireWorkspaceMember(workspaceId, callerId);

        Category category = resolveCategory(dto.categoryId(), workspaceId);
        Team team = teamRepository.findById(dto.teamId())
                .orElseThrow(() -> new ResourceNotFoundException("TEAM_NOT_FOUND"));
        if (!team.getWorkspace().getId().equals(workspaceId)) {
            throw new ForbiddenException("TEAM_WRONG_WORKSPACE");
        }

        ProjectVisibility visibility = dto.visibility() != null
                ? ProjectVisibility.valueOf(dto.visibility().toUpperCase())
                : ProjectVisibility.PRIVATE;

        Project project = Project.builder()
                .workspace(workspace)
                .category(category)
                .team(team)
                .name(dto.name())
                .description(dto.description())
                .color(dto.color())
                .visibility(visibility)
                .build();
        projectRepository.save(project);

        return ProjectResponseDto.from(project);
    }

    @Transactional(readOnly = true)
    public List<ProjectResponseDto> findByWorkspace(UUID workspaceId, UUID callerId) {
        workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("WORKSPACE_NOT_FOUND"));
        requireWorkspaceMember(workspaceId, callerId);

        return projectRepository.findVisibleByWorkspaceIdAndUserId(workspaceId, callerId, ProjectVisibility.WORKSPACE).stream()
                .map(ProjectResponseDto::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public ProjectResponseDto findById(UUID projectId, UUID callerId) {
        Project project = getProjectOrThrow(projectId);
        requireProjectAccess(project, callerId);
        return ProjectResponseDto.from(project);
    }

    @Transactional
    public ProjectResponseDto update(UUID projectId, UpdateProjectRequestDto dto, UUID callerId) {
        Project project = getProjectOrThrow(projectId);
        requireAdmin(project, callerId);

        Category category = resolveCategory(dto.categoryId(), project.getWorkspace().getId());
        Team newTeam = dto.teamId() != null
                ? resolveTeam(dto.teamId(), project.getWorkspace().getId())
                : project.getTeam();

        ProjectVisibility visibility = dto.visibility() != null
                ? ProjectVisibility.valueOf(dto.visibility().toUpperCase())
                : project.getVisibility();

        project.setName(dto.name());
        project.setDescription(dto.description());
        project.setCategory(category);
        project.setTeam(newTeam);
        project.setColor(dto.color());
        project.setVisibility(visibility);
        projectRepository.save(project);

        return ProjectResponseDto.from(project);
    }

    @Transactional
    public void delete(UUID projectId, UUID callerId) {
        Project project = getProjectOrThrow(projectId);
        requireAdmin(project, callerId);
        projectRepository.deleteById(projectId);
    }

    @Transactional(readOnly = true)
    public List<TeamMemberResponseDto> getTeamMembers(UUID projectId, UUID callerId) {
        Project project = getProjectOrThrow(projectId);
        requireProjectAccess(project, callerId);
        if (project.getTeam() == null) {
            return List.of();
        }
        return teamMemberRepository.findByTeamId(project.getTeam().getId()).stream()
                .map(TeamMemberResponseDto::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public MemberPermissionsDto getMemberPermissions(UUID projectId, UUID userId) {
        Project project = getProjectOrThrow(projectId);

        boolean wsAdmin = workspaceMemberRepository
                .existsByWorkspaceIdAndUserIdAndRole(project.getWorkspace().getId(), userId, WorkspaceRole.ADMIN);

        if (project.getTeam() == null) {
            if (wsAdmin) {
                return new MemberPermissionsDto(true, false, null);
            }
            throw new ResourceNotFoundException("MEMBER_NOT_FOUND");
        }

        var optionalMember = teamMemberRepository
                .findByTeamIdAndUserId(project.getTeam().getId(), userId);

        if (optionalMember.isEmpty()) {
            if (wsAdmin) {
                return new MemberPermissionsDto(true, false, null);
            }
            throw new ResourceNotFoundException("MEMBER_NOT_FOUND");
        }

        TeamMember teamMember = optionalMember.get();
        boolean teamAdmin = teamMember.getRole() == TeamRole.ADMIN;
        return new MemberPermissionsDto(wsAdmin, teamAdmin, teamMember.getScrumRole());
    }

    @Transactional
    public void touchUpdatedAt(UUID projectId) {
        Project project = getProjectOrThrow(projectId);
        project.setUpdatedAt(Instant.now());
        projectRepository.save(project);
    }

    @Transactional
    public void touchMemberActivity(UUID projectId, UUID userId) {
        Project project = getProjectOrThrow(projectId);
        if (project.getTeam() == null) return;
        teamMemberRepository.findByTeamIdAndUserId(project.getTeam().getId(), userId)
                .ifPresent(member -> {
                    member.setLastActiveAt(Instant.now());
                    teamMemberRepository.save(member);
                });
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private Project getProjectOrThrow(UUID id) {
        return projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PROJECT_NOT_FOUND"));
    }

    private Category resolveCategory(UUID categoryId, UUID workspaceId) {
        if (categoryId == null) return null;
        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("CATEGORY_NOT_FOUND"));
        if (!category.getWorkspace().getId().equals(workspaceId)) {
            throw new ForbiddenException("CATEGORY_WRONG_WORKSPACE");
        }
        return category;
    }

    private Team resolveTeam(UUID teamId, UUID workspaceId) {
        if (teamId == null) return null;
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("TEAM_NOT_FOUND"));
        if (!team.getWorkspace().getId().equals(workspaceId)) {
            throw new ForbiddenException("TEAM_WRONG_WORKSPACE");
        }
        return team;
    }

    private void requireWorkspaceMember(UUID workspaceId, UUID userId) {
        if (!workspaceMemberRepository.existsByWorkspaceIdAndUserId(workspaceId, userId)) {
            throw new ForbiddenException("NOT_WORKSPACE_MEMBER");
        }
    }

    private void requireProjectAccess(Project project, UUID userId) {
        // Workspace admins always have access
        if (workspaceMemberRepository.existsByWorkspaceIdAndUserIdAndRole(
                project.getWorkspace().getId(), userId, WorkspaceRole.ADMIN)) {
            return;
        }
        // Workspace-visible projects are accessible to all workspace members
        if (project.getVisibility() == ProjectVisibility.WORKSPACE
                && workspaceMemberRepository.existsByWorkspaceIdAndUserId(project.getWorkspace().getId(), userId)) {
            return;
        }
        // Team members have access
        if (project.getTeam() != null
                && teamMemberRepository.existsByTeamIdAndUserId(project.getTeam().getId(), userId)) {
            return;
        }
        throw new ForbiddenException("NOT_PROJECT_MEMBER");
    }

    private void requireAdmin(Project project, UUID userId) {
        // Workspace admin
        if (workspaceMemberRepository.existsByWorkspaceIdAndUserIdAndRole(
                project.getWorkspace().getId(), userId, WorkspaceRole.ADMIN)) {
            return;
        }
        // Team admin
        if (project.getTeam() != null) {
            boolean isTeamAdmin = teamMemberRepository.findByTeamIdAndUserId(project.getTeam().getId(), userId)
                    .map(m -> m.getRole() == TeamRole.ADMIN)
                    .orElse(false);
            if (isTeamAdmin) return;
        }
        throw new ForbiddenException("ADMIN_REQUIRED");
    }
}