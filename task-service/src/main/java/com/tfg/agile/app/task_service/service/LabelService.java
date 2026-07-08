package com.tfg.agile.app.task_service.service;

import com.tfg.agile.app.task_service.client.MemberPermissionsDto;
import com.tfg.agile.app.task_service.client.ProjectServiceClient;
import com.tfg.agile.app.task_service.dto.CreateLabelRequestDto;
import com.tfg.agile.app.task_service.dto.LabelDto;
import com.tfg.agile.app.task_service.dto.UpdateLabelRequestDto;
import com.tfg.agile.app.task_service.entity.Label;
import com.tfg.agile.app.task_service.exception.ForbiddenException;
import com.tfg.agile.app.task_service.exception.ResourceNotFoundException;
import com.tfg.agile.app.task_service.repository.LabelRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class LabelService {

    private final LabelRepository labelRepository;
    private final ProjectServiceClient projectServiceClient;

    public LabelService(LabelRepository labelRepository,
                        ProjectServiceClient projectServiceClient) {
        this.labelRepository = labelRepository;
        this.projectServiceClient = projectServiceClient;
    }

    @Transactional(readOnly = true)
    public List<LabelDto> findByProject(UUID projectId, UUID callerId) {
        projectServiceClient.getMemberPermissions(projectId, callerId);
        return labelRepository.findByProjectIdOrderByNameAsc(projectId).stream()
                .map(LabelDto::from)
                .toList();
    }

    @Transactional
    public LabelDto create(UUID projectId, CreateLabelRequestDto dto, UUID callerId) {
        MemberPermissionsDto perms = projectServiceClient.getMemberPermissions(projectId, callerId);
        requireAdmin(perms);

        Label label = Label.builder()
                .projectId(projectId)
                .name(dto.name())
                .color(dto.color() != null ? dto.color() : "#6B7280")
                .build();

        return LabelDto.from(labelRepository.save(label));
    }

    @Transactional
    public LabelDto update(UUID labelId, UpdateLabelRequestDto dto, UUID callerId) {
        Label label = getLabelOrThrow(labelId);
        MemberPermissionsDto perms = projectServiceClient.getMemberPermissions(label.getProjectId(), callerId);
        requireAdmin(perms);

        label.setName(dto.name());
        if (dto.color() != null) {
            label.setColor(dto.color());
        }

        return LabelDto.from(labelRepository.save(label));
    }

    @Transactional
    public void delete(UUID labelId, UUID callerId) {
        Label label = getLabelOrThrow(labelId);
        MemberPermissionsDto perms = projectServiceClient.getMemberPermissions(label.getProjectId(), callerId);
        requireAdmin(perms);

        labelRepository.delete(label);
    }

    private Label getLabelOrThrow(UUID id) {
        return labelRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("LABEL_NOT_FOUND"));
    }

    private void requireAdmin(MemberPermissionsDto perms) {
        if (!perms.workspaceAdmin() && !perms.teamAdmin()) {
            throw new ForbiddenException("ONLY_ADMINS_CAN_MANAGE_LABELS");
        }
    }
}