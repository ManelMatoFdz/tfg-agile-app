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
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final CategoryRepository categoryRepository;

    public ProjectService(ProjectRepository projectRepository,
                          ProjectMemberRepository projectMemberRepository,
                          WorkspaceRepository workspaceRepository,
                          WorkspaceMemberRepository workspaceMemberRepository,
                          TeamRepository teamRepository,
                          TeamMemberRepository teamMemberRepository,
                          CategoryRepository categoryRepository) {
        this.projectRepository = projectRepository;
        this.projectMemberRepository = projectMemberRepository;
        this.workspaceRepository = workspaceRepository;
        this.workspaceMemberRepository = workspaceMemberRepository;
        this.teamRepository = teamRepository;
        this.teamMemberRepository = teamMemberRepository;
        this.categoryRepository = categoryRepository;
    }

    @Transactional
    public ProjectResponseDto create(UUID workspaceId, CreateProjectRequestDto dto, UUID callerId) {
        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace not found"));
        requireWorkspaceMember(workspaceId, callerId);

        Category category = resolveCategory(dto.categoryId(), workspaceId);

        Project project = Project.builder()
                .workspace(workspace)
                .category(category)
                .name(dto.name())
                .description(dto.description())
                .build();
        projectRepository.save(project);

        ProjectMember member = ProjectMember.builder()
                .project(project)
                .userId(callerId)
                .role(ProjectRole.ADMIN)
                .build();
        projectMemberRepository.save(member);

        return ProjectResponseDto.from(project);
    }

    @Transactional(readOnly = true)
    public List<ProjectResponseDto> findByWorkspace(UUID workspaceId, UUID callerId) {
        workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace not found"));
        requireWorkspaceMember(workspaceId, callerId);

        return projectMemberRepository.findProjectsByUserIdAndWorkspaceId(callerId, workspaceId).stream()
                .map(ProjectResponseDto::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public ProjectResponseDto findById(UUID projectId, UUID callerId) {
        Project project = getProjectOrThrow(projectId);
        requireProjectMember(projectId, callerId);
        return ProjectResponseDto.from(project);
    }

    @Transactional
    public ProjectResponseDto update(UUID projectId, UpdateProjectRequestDto dto, UUID callerId) {
        Project project = getProjectOrThrow(projectId);
        requireProjectAdmin(projectId, callerId);

        Category category = resolveCategory(dto.categoryId(), project.getWorkspace().getId());

        project.setName(dto.name());
        project.setDescription(dto.description());
        project.setCategory(category);
        return ProjectResponseDto.from(projectRepository.save(project));
    }

    @Transactional
    public void delete(UUID projectId, UUID callerId) {
        getProjectOrThrow(projectId);
        requireProjectAdmin(projectId, callerId);
        projectRepository.deleteById(projectId);
    }

    @Transactional(readOnly = true)
    public List<ProjectMemberResponseDto> getMembers(UUID projectId, UUID callerId) {
        getProjectOrThrow(projectId);
        requireProjectMember(projectId, callerId);
        return projectMemberRepository.findByProjectId(projectId).stream()
                .map(ProjectMemberResponseDto::from)
                .toList();
    }

    @Transactional
    public ProjectMemberResponseDto addMember(UUID projectId, AddMemberRequestDto dto, UUID callerId) {
        Project project = getProjectOrThrow(projectId);
        requireProjectAdmin(projectId, callerId);
        if (projectMemberRepository.existsByProjectIdAndUserId(projectId, dto.userId())) {
            throw new ConflictException("User is already a member of this project");
        }
        ProjectRole role = ProjectRole.valueOf(dto.role().toUpperCase());
        ProjectMember member = ProjectMember.builder()
                .project(project)
                .userId(dto.userId())
                .role(role)
                .build();
        return ProjectMemberResponseDto.from(projectMemberRepository.save(member));
    }

    @Transactional
    public ProjectMemberResponseDto updateMemberRole(UUID projectId, UUID targetUserId,
                                                     UpdateMemberRoleRequestDto dto, UUID callerId) {
        getProjectOrThrow(projectId);
        requireProjectAdmin(projectId, callerId);
        ProjectMember member = projectMemberRepository.findByProjectIdAndUserId(projectId, targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Member not found"));
        member.setRole(ProjectRole.valueOf(dto.role().toUpperCase()));
        return ProjectMemberResponseDto.from(projectMemberRepository.save(member));
    }

    @Transactional
    public void removeMember(UUID projectId, UUID targetUserId, UUID callerId) {
        getProjectOrThrow(projectId);
        requireProjectAdmin(projectId, callerId);
        ProjectMember member = projectMemberRepository.findByProjectIdAndUserId(projectId, targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Member not found"));
        projectMemberRepository.delete(member);
    }

    @Transactional
    public List<ProjectMemberResponseDto> addMembersFromTeam(UUID projectId, UUID teamId,
                                                             AddTeamMembersRequestDto dto,
                                                             UUID callerId) {
        Project project = getProjectOrThrow(projectId);
        requireProjectAdmin(projectId, callerId);

        teamRepository.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found"));

        List<UUID> teamUserIds = teamMemberRepository.findByTeamId(teamId).stream()
                .map(TeamMember::getUserId)
                .toList();

        List<UUID> targetUserIds;
        if (dto != null && dto.userIds() != null && !dto.userIds().isEmpty()) {
            List<UUID> invalidUsers = dto.userIds().stream()
                    .filter(uid -> !teamUserIds.contains(uid))
                    .toList();
            if (!invalidUsers.isEmpty()) {
                throw new ForbiddenException("Some users are not members of this team");
            }
            targetUserIds = dto.userIds();
        } else {
            targetUserIds = teamUserIds;
        }

        List<UUID> alreadyMembers = projectMemberRepository
                .findByProjectIdAndUserIdIn(projectId, targetUserIds).stream()
                .map(ProjectMember::getUserId)
                .toList();

        List<ProjectMember> newMembers = targetUserIds.stream()
                .filter(uid -> !alreadyMembers.contains(uid))
                .map(uid -> ProjectMember.builder()
                        .project(project)
                        .userId(uid)
                        .role(ProjectRole.MEMBER)
                        .build())
                .toList();

        return projectMemberRepository.saveAll(newMembers).stream()
                .map(ProjectMemberResponseDto::from)
                .toList();
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private Project getProjectOrThrow(UUID id) {
        return projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));
    }

    private Category resolveCategory(UUID categoryId, UUID workspaceId) {
        if (categoryId == null) return null;
        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
        if (!category.getWorkspace().getId().equals(workspaceId)) {
            throw new ForbiddenException("Category does not belong to this workspace");
        }
        return category;
    }

    private void requireWorkspaceMember(UUID workspaceId, UUID userId) {
        if (!workspaceMemberRepository.existsByWorkspaceIdAndUserId(workspaceId, userId)) {
            throw new ForbiddenException("Not a member of this workspace");
        }
    }

    private void requireProjectMember(UUID projectId, UUID userId) {
        if (!projectMemberRepository.existsByProjectIdAndUserId(projectId, userId)) {
            throw new ForbiddenException("Not a member of this project");
        }
    }

    private void requireProjectAdmin(UUID projectId, UUID userId) {
        if (!projectMemberRepository.existsByProjectIdAndUserIdAndRole(projectId, userId, ProjectRole.ADMIN)) {
            throw new ForbiddenException("Project admin role required");
        }
    }
}