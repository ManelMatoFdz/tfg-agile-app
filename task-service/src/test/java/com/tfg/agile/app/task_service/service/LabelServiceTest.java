package com.tfg.agile.app.task_service.service;

import com.tfg.agile.app.task_service.client.ProjectServiceClient;
import com.tfg.agile.app.task_service.dto.CreateLabelRequestDto;
import com.tfg.agile.app.task_service.dto.UpdateLabelRequestDto;
import com.tfg.agile.app.task_service.entity.Label;
import com.tfg.agile.app.task_service.exception.ForbiddenException;
import com.tfg.agile.app.task_service.exception.ResourceNotFoundException;
import com.tfg.agile.app.task_service.repository.LabelRepository;
import com.tfg.agile.app.task_service.support.TestDataFactory;
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
class LabelServiceTest {

    @Mock
    private LabelRepository labelRepository;
    @Mock
    private ProjectServiceClient projectServiceClient;

    private LabelService service;

    @BeforeEach
    void setUp() {
        service = new LabelService(labelRepository, projectServiceClient);
    }

    @Test
    void findByProject_returnsSortedLabels() {
        UUID projectId = UUID.randomUUID();
        UUID callerId = UUID.randomUUID();

        Label label = Label.builder()
                .id(UUID.randomUUID())
                .projectId(projectId)
                .name("Bug")
                .color("#FF0000")
                .build();

        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.memberPermissions());
        when(labelRepository.findByProjectIdOrderByNameAsc(projectId)).thenReturn(List.of(label));

        var result = service.findByProject(projectId, callerId);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).name()).isEqualTo("Bug");
        verify(projectServiceClient).getMemberPermissions(projectId, callerId);
    }

    @Test
    void create_adminCanCreate() {
        UUID projectId = UUID.randomUUID();
        UUID callerId = UUID.randomUUID();

        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.adminPermissions());
        when(labelRepository.save(any(Label.class))).thenAnswer(invocation -> {
            Label l = invocation.getArgument(0);
            l.setId(UUID.randomUUID());
            return l;
        });

        var result = service.create(projectId, new CreateLabelRequestDto("Feature", "#00FF00"), callerId);

        assertThat(result.name()).isEqualTo("Feature");
        assertThat(result.color()).isEqualTo("#00FF00");
    }

    @Test
    void create_defaultColorWhenNull() {
        UUID projectId = UUID.randomUUID();
        UUID callerId = UUID.randomUUID();

        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.adminPermissions());
        when(labelRepository.save(any(Label.class))).thenAnswer(invocation -> {
            Label l = invocation.getArgument(0);
            l.setId(UUID.randomUUID());
            return l;
        });

        var result = service.create(projectId, new CreateLabelRequestDto("Feature", null), callerId);

        assertThat(result.color()).isEqualTo("#6B7280");
    }

    @Test
    void create_throwsWhenNotAdmin() {
        UUID projectId = UUID.randomUUID();
        UUID callerId = UUID.randomUUID();

        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.memberPermissions());

        assertThatThrownBy(() -> service.create(projectId, new CreateLabelRequestDto("Feature", null), callerId))
                .isInstanceOf(ForbiddenException.class)
                .hasMessage("ONLY_ADMINS_CAN_MANAGE_LABELS");
    }

    @Test
    void update_updatesNameAndColor() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        UUID labelId = UUID.randomUUID();

        Label label = Label.builder()
                .id(labelId)
                .projectId(projectId)
                .name("Old")
                .color("#000000")
                .build();

        when(labelRepository.findById(labelId)).thenReturn(Optional.of(label));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.adminPermissions());
        when(labelRepository.save(any(Label.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var result = service.update(labelId, new UpdateLabelRequestDto("New", "#FFFFFF"), callerId);

        assertThat(result.name()).isEqualTo("New");
        assertThat(result.color()).isEqualTo("#FFFFFF");
    }

    @Test
    void delete_deletesLabel() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        UUID labelId = UUID.randomUUID();

        Label label = Label.builder()
                .id(labelId)
                .projectId(projectId)
                .name("ToDelete")
                .color("#000000")
                .build();

        when(labelRepository.findById(labelId)).thenReturn(Optional.of(label));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.adminPermissions());

        service.delete(labelId, callerId);

        verify(labelRepository).delete(label);
    }

    @Test
    void delete_throwsWhenLabelNotFound() {
        UUID labelId = UUID.randomUUID();

        when(labelRepository.findById(labelId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.delete(labelId, UUID.randomUUID()))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("LABEL_NOT_FOUND");
    }
}