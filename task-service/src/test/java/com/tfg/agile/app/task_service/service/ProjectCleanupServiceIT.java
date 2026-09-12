package com.tfg.agile.app.task_service.service;

import com.tfg.agile.app.task_service.FlywayMigrationConfig;
import com.tfg.agile.app.task_service.entity.BoardColumn;
import com.tfg.agile.app.task_service.entity.Epic;
import com.tfg.agile.app.task_service.entity.GitEvent;
import com.tfg.agile.app.task_service.entity.GitEventType;
import com.tfg.agile.app.task_service.entity.GitIntegration;
import com.tfg.agile.app.task_service.entity.Label;
import com.tfg.agile.app.task_service.entity.Sprint;
import com.tfg.agile.app.task_service.entity.SprintTaskSnapshot;
import com.tfg.agile.app.task_service.entity.Task;
import com.tfg.agile.app.task_service.entity.TaskActivity;
import com.tfg.agile.app.task_service.entity.TaskActivityType;
import com.tfg.agile.app.task_service.entity.TaskComment;
import com.tfg.agile.app.task_service.entity.TaskDependency;
import com.tfg.agile.app.task_service.entity.TaskPriority;
import com.tfg.agile.app.task_service.entity.TaskType;
import com.tfg.agile.app.task_service.repository.BoardColumnRepository;
import com.tfg.agile.app.task_service.repository.EpicRepository;
import com.tfg.agile.app.task_service.repository.GitEventRepository;
import com.tfg.agile.app.task_service.repository.GitIntegrationRepository;
import com.tfg.agile.app.task_service.repository.LabelRepository;
import com.tfg.agile.app.task_service.repository.SprintRepository;
import com.tfg.agile.app.task_service.repository.SprintTaskSnapshotRepository;
import com.tfg.agile.app.task_service.repository.TaskActivityRepository;
import com.tfg.agile.app.task_service.repository.TaskCommentRepository;
import com.tfg.agile.app.task_service.repository.TaskDependencyRepository;
import com.tfg.agile.app.task_service.repository.TaskRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Testcontainers
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({FlywayMigrationConfig.class, ProjectCleanupService.class})
class ProjectCleanupServiceIT {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired private ProjectCleanupService projectCleanupService;
    @Autowired private SprintTaskSnapshotRepository sprintTaskSnapshotRepository;
    @Autowired private TaskDependencyRepository taskDependencyRepository;
    @Autowired private TaskActivityRepository taskActivityRepository;
    @Autowired private TaskCommentRepository taskCommentRepository;
    @Autowired private TaskRepository taskRepository;
    @Autowired private SprintRepository sprintRepository;
    @Autowired private EpicRepository epicRepository;
    @Autowired private LabelRepository labelRepository;
    @Autowired private BoardColumnRepository boardColumnRepository;
    @Autowired private GitEventRepository gitEventRepository;
    @Autowired private GitIntegrationRepository gitIntegrationRepository;
    @Autowired private JdbcTemplate jdbcTemplate;

    @Test
    void deleteAllByProjectIdRemovesProjectDataAndKeepsOtherProjects() {
        UUID projectId = UUID.randomUUID();
        UUID otherProjectId = UUID.randomUUID();

        seedProjectData(projectId, "target");
        seedProjectData(otherProjectId, "other");

        projectCleanupService.deleteAllByProjectId(projectId);

        assertThat(countByProjectId("tasks", projectId)).isZero();
        assertThat(countByProjectId("sprints", projectId)).isZero();
        assertThat(countByProjectId("epics", projectId)).isZero();
        assertThat(countByProjectId("labels", projectId)).isZero();
        assertThat(countByProjectId("board_columns", projectId)).isZero();
        assertThat(countByProjectId("git_events", projectId)).isZero();
        assertThat(countByProjectId("git_integrations", projectId)).isZero();
        assertThat(countTaskLabelsForProject(projectId)).isZero();
        assertThat(countTaskChildren("task_activities", projectId)).isZero();
        assertThat(countTaskChildren("task_comments", projectId)).isZero();
        assertThat(countTaskDependenciesForProject(projectId)).isZero();
        assertThat(countSprintSnapshotsForProject(projectId)).isZero();

        assertThat(countByProjectId("tasks", otherProjectId)).isEqualTo(2);
        assertThat(countByProjectId("sprints", otherProjectId)).isEqualTo(1);
        assertThat(countByProjectId("epics", otherProjectId)).isEqualTo(1);
        assertThat(countByProjectId("labels", otherProjectId)).isEqualTo(1);
        assertThat(countByProjectId("board_columns", otherProjectId)).isEqualTo(1);
        assertThat(countByProjectId("git_events", otherProjectId)).isEqualTo(1);
        assertThat(countByProjectId("git_integrations", otherProjectId)).isEqualTo(1);
    }

    private void seedProjectData(UUID projectId, String prefix) {
        UUID reporterId = UUID.randomUUID();

        Sprint sprint = sprintRepository.save(Sprint.builder()
                .projectId(projectId)
                .name(prefix + " sprint")
                .goal("Goal")
                .build());
        Epic epic = epicRepository.save(Epic.builder()
                .projectId(projectId)
                .name(prefix + " epic")
                .createdBy(reporterId)
                .build());
        Label label = labelRepository.save(Label.builder()
                .projectId(projectId)
                .name(prefix + " label")
                .color("#3366FF")
                .build());
        Task parent = taskRepository.save(Task.builder()
                .projectId(projectId)
                .title(prefix + " parent")
                .reporterId(reporterId)
                .build());
        Task child = taskRepository.save(Task.builder()
                .projectId(projectId)
                .title(prefix + " child")
                .parentId(parent.getId())
                .epicId(epic.getId())
                .sprintId(sprint.getId())
                .reporterId(reporterId)
                .build());
        child.getLabels().add(label);
        taskRepository.saveAndFlush(child);

        sprintTaskSnapshotRepository.save(SprintTaskSnapshot.builder()
                .sprintId(sprint.getId())
                .taskId(child.getId())
                .title(prefix + " snapshot")
                .statusAtEnd("DONE")
                .priority(TaskPriority.MEDIUM)
                .type(TaskType.TASK)
                .completed(true)
                .returnedToBacklog(false)
                .build());
        taskDependencyRepository.save(TaskDependency.builder()
                .blockingTaskId(parent.getId())
                .blockedTaskId(child.getId())
                .createdBy(reporterId)
                .build());
        taskActivityRepository.save(TaskActivity.builder()
                .taskId(child.getId())
                .actorId(reporterId)
                .type(TaskActivityType.CREATED)
                .build());
        taskCommentRepository.save(TaskComment.builder()
                .taskId(child.getId())
                .authorId(reporterId)
                .content(prefix + " comment")
                .build());
        gitEventRepository.save(GitEvent.builder()
                .projectId(projectId)
                .taskId(child.getId())
                .type(GitEventType.COMMIT)
                .externalId(prefix + "-commit")
                .externalUrl("https://example.com/" + prefix)
                .title(prefix + " commit")
                .author("Ada")
                .build());
        gitIntegrationRepository.save(GitIntegration.builder()
                .projectId(projectId)
                .repositoryUrl("https://example.com/" + prefix + ".git")
                .webhookSecret("secret")
                .createdBy(reporterId)
                .build());
        boardColumnRepository.save(BoardColumn.builder()
                .projectId(projectId)
                .name(prefix + " column")
                .position(1)
                .build());
        taskRepository.flush();
    }

    private long countByProjectId(String table, UUID projectId) {
        return jdbcTemplate.queryForObject(
                "select count(*) from " + table + " where project_id = ?",
                Long.class,
                projectId
        );
    }

    private long countTaskLabelsForProject(UUID projectId) {
        return jdbcTemplate.queryForObject(
                "select count(*) from task_labels tl join tasks t on t.id = tl.task_id where t.project_id = ?",
                Long.class,
                projectId
        );
    }

    private long countTaskChildren(String table, UUID projectId) {
        return jdbcTemplate.queryForObject(
                "select count(*) from " + table + " c join tasks t on t.id = c.task_id where t.project_id = ?",
                Long.class,
                projectId
        );
    }

    private long countTaskDependenciesForProject(UUID projectId) {
        return jdbcTemplate.queryForObject(
                """
                select count(*)
                from task_dependencies d
                where d.blocking_task_id in (select id from tasks where project_id = ?)
                   or d.blocked_task_id in (select id from tasks where project_id = ?)
                """,
                Long.class,
                projectId,
                projectId
        );
    }

    private long countSprintSnapshotsForProject(UUID projectId) {
        return jdbcTemplate.queryForObject(
                """
                select count(*)
                from sprint_task_snapshots s
                where s.sprint_id in (select id from sprints where project_id = ?)
                """,
                Long.class,
                projectId
        );
    }
}
