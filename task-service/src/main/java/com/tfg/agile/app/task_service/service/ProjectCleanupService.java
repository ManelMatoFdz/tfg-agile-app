package com.tfg.agile.app.task_service.service;

import com.tfg.agile.app.task_service.repository.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@Slf4j
public class ProjectCleanupService {

    private final SprintTaskSnapshotRepository sprintTaskSnapshotRepository;
    private final TaskDependencyRepository taskDependencyRepository;
    private final TaskActivityRepository taskActivityRepository;
    private final TaskCommentRepository taskCommentRepository;
    private final TaskRepository taskRepository;
    private final SprintRepository sprintRepository;
    private final EpicRepository epicRepository;
    private final LabelRepository labelRepository;
    private final BoardColumnRepository boardColumnRepository;
    private final GitEventRepository gitEventRepository;
    private final GitIntegrationRepository gitIntegrationRepository;

    public ProjectCleanupService(SprintTaskSnapshotRepository sprintTaskSnapshotRepository,
                                 TaskDependencyRepository taskDependencyRepository,
                                 TaskActivityRepository taskActivityRepository,
                                 TaskCommentRepository taskCommentRepository,
                                 TaskRepository taskRepository,
                                 SprintRepository sprintRepository,
                                 EpicRepository epicRepository,
                                 LabelRepository labelRepository,
                                 BoardColumnRepository boardColumnRepository,
                                 GitEventRepository gitEventRepository,
                                 GitIntegrationRepository gitIntegrationRepository) {
        this.sprintTaskSnapshotRepository = sprintTaskSnapshotRepository;
        this.taskDependencyRepository = taskDependencyRepository;
        this.taskActivityRepository = taskActivityRepository;
        this.taskCommentRepository = taskCommentRepository;
        this.taskRepository = taskRepository;
        this.sprintRepository = sprintRepository;
        this.epicRepository = epicRepository;
        this.labelRepository = labelRepository;
        this.boardColumnRepository = boardColumnRepository;
        this.gitEventRepository = gitEventRepository;
        this.gitIntegrationRepository = gitIntegrationRepository;
    }

    @Transactional
    public void deleteAllByProjectId(UUID projectId) {
        log.info("Starting cleanup of all data for project {}", projectId);

        // 1. Sprint task snapshots (reference sprints)
        sprintTaskSnapshotRepository.deleteByProjectId(projectId);

        // 2. Task dependencies (reference tasks on both sides)
        taskDependencyRepository.deleteByProjectId(projectId);

        // 3. Task activities (reference tasks)
        taskActivityRepository.deleteByProjectId(projectId);

        // 4. Task comments (reference tasks)
        taskCommentRepository.deleteByProjectId(projectId);

        // 5. task_labels join table (many-to-many between tasks and labels)
        taskRepository.deleteTaskLabelsByProjectId(projectId);

        // 6. Clear self-references (parentId, epicId, sprintId) to avoid FK issues
        taskRepository.clearReferencesForProjectId(projectId);

        // 7. Git events (have projectId directly)
        gitEventRepository.deleteByProjectId(projectId);

        // 8. Git integration (has projectId directly)
        gitIntegrationRepository.deleteByProjectId(projectId);

        // 9. Tasks
        taskRepository.deleteByProjectId(projectId);

        // 10. Sprints
        sprintRepository.deleteByProjectId(projectId);

        // 11. Epics
        epicRepository.deleteByProjectId(projectId);

        // 12. Labels
        labelRepository.deleteByProjectId(projectId);

        // 13. Board columns
        boardColumnRepository.deleteByProjectId(projectId);
        taskRepository.flush();

        log.info("Completed cleanup of all data for project {}", projectId);
    }
}
