package com.tfg.agile.app.task_service.service;

import com.tfg.agile.app.task_service.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.UUID;

import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class ProjectCleanupServiceTest {

    @Mock private SprintTaskSnapshotRepository sprintTaskSnapshotRepository;
    @Mock private TaskDependencyRepository taskDependencyRepository;
    @Mock private TaskActivityRepository taskActivityRepository;
    @Mock private TaskCommentRepository taskCommentRepository;
    @Mock private TaskRepository taskRepository;
    @Mock private SprintRepository sprintRepository;
    @Mock private EpicRepository epicRepository;
    @Mock private LabelRepository labelRepository;
    @Mock private BoardColumnRepository boardColumnRepository;
    @Mock private GitEventRepository gitEventRepository;
    @Mock private GitIntegrationRepository gitIntegrationRepository;

    @Test
    void deleteAllByProjectId_deletesAllEntitiesInCorrectOrder() {
        ProjectCleanupService service = new ProjectCleanupService(
                sprintTaskSnapshotRepository, taskDependencyRepository,
                taskActivityRepository, taskCommentRepository,
                taskRepository, sprintRepository, epicRepository,
                labelRepository, boardColumnRepository,
                gitEventRepository, gitIntegrationRepository
        );

        UUID projectId = UUID.randomUUID();

        service.deleteAllByProjectId(projectId);

        // Verify dependent entities are deleted before parent entities
        InOrder order = inOrder(
                sprintTaskSnapshotRepository, taskDependencyRepository,
                taskActivityRepository, taskCommentRepository,
                taskRepository, sprintRepository, epicRepository,
                labelRepository, boardColumnRepository,
                gitEventRepository, gitIntegrationRepository
        );

        order.verify(sprintTaskSnapshotRepository).deleteByProjectId(projectId);
        order.verify(taskDependencyRepository).deleteByProjectId(projectId);
        order.verify(taskActivityRepository).deleteByProjectId(projectId);
        order.verify(taskCommentRepository).deleteByProjectId(projectId);
        order.verify(taskRepository).deleteTaskLabelsByProjectId(projectId);
        order.verify(taskRepository).clearReferencesForProjectId(projectId);
        order.verify(gitEventRepository).deleteByProjectId(projectId);
        order.verify(gitIntegrationRepository).deleteByProjectId(projectId);
        order.verify(taskRepository).deleteByProjectId(projectId);
        order.verify(sprintRepository).deleteByProjectId(projectId);
        order.verify(epicRepository).deleteByProjectId(projectId);
        order.verify(labelRepository).deleteByProjectId(projectId);
        order.verify(boardColumnRepository).deleteByProjectId(projectId);
        order.verify(taskRepository).flush();
    }
}
