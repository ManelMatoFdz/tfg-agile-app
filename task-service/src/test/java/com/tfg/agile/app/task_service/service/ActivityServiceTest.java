package com.tfg.agile.app.task_service.service;

import com.tfg.agile.app.task_service.entity.TaskActivity;
import com.tfg.agile.app.task_service.entity.TaskActivityType;
import com.tfg.agile.app.task_service.repository.TaskActivityRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ActivityServiceTest {

    @Mock
    private TaskActivityRepository activityRepository;

    private ActivityService service;

    @BeforeEach
    void setUp() {
        service = new ActivityService(activityRepository);
    }

    @Test
    void findByTask_returnsMappedActivities() {
        UUID taskId = UUID.randomUUID();
        TaskActivity activity = TaskActivity.builder()
                .id(UUID.randomUUID())
                .taskId(taskId)
                .actorId(UUID.randomUUID())
                .type(TaskActivityType.STATUS_CHANGED)
                .oldValue("TODO")
                .newValue("IN_PROGRESS")
                .createdAt(Instant.now())
                .build();

        when(activityRepository.findByTaskIdOrderByCreatedAtAsc(taskId)).thenReturn(List.of(activity));

        var result = service.findByTask(taskId);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).type()).isEqualTo("STATUS_CHANGED");
        assertThat(result.get(0).oldValue()).isEqualTo("TODO");
        assertThat(result.get(0).newValue()).isEqualTo("IN_PROGRESS");
    }

    @Test
    void record_savesActivity() {
        UUID taskId = UUID.randomUUID();
        UUID actorId = UUID.randomUUID();

        service.record(taskId, actorId, TaskActivityType.PRIORITY_CHANGED, "MEDIUM", "HIGH");

        verify(activityRepository).save(any(TaskActivity.class));
    }
}