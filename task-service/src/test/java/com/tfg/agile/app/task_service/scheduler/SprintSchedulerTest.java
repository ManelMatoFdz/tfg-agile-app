package com.tfg.agile.app.task_service.scheduler;

import com.tfg.agile.app.task_service.entity.Sprint;
import com.tfg.agile.app.task_service.entity.SprintStatus;
import com.tfg.agile.app.task_service.repository.SprintRepository;
import com.tfg.agile.app.task_service.service.SprintService;
import com.tfg.agile.app.task_service.support.TestDataFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SprintSchedulerTest {

    @Mock
    private SprintRepository sprintRepository;
    @Mock
    private SprintService sprintService;

    private SprintScheduler scheduler;

    @BeforeEach
    void setUp() {
        scheduler = new SprintScheduler(sprintRepository, sprintService);
    }

    @Test
    void autoStartSprints_activatesReadySprints() {
        Sprint sprint = TestDataFactory.sprint(java.util.UUID.randomUUID());
        sprint.setStartDate(LocalDate.now());

        when(sprintRepository.findByStatusAndStartDateLessThanEqual(SprintStatus.PLANNING, LocalDate.now()))
                .thenReturn(List.of(sprint));
        when(sprintService.activateSprintInternal(sprint)).thenReturn(true);

        scheduler.autoStartSprints();

        verify(sprintService).activateSprintInternal(sprint);
    }

    @Test
    void autoStartSprints_skipsWhenAnotherSprintActive() {
        Sprint sprint = TestDataFactory.sprint(java.util.UUID.randomUUID());
        sprint.setStartDate(LocalDate.now());

        when(sprintRepository.findByStatusAndStartDateLessThanEqual(SprintStatus.PLANNING, LocalDate.now()))
                .thenReturn(List.of(sprint));
        when(sprintService.activateSprintInternal(sprint)).thenReturn(false);

        scheduler.autoStartSprints();

        verify(sprintService).activateSprintInternal(sprint);
    }

    @Test
    void closeOverdueSprints_closesActivePastEndDate() {
        Sprint sprint = TestDataFactory.sprint(java.util.UUID.randomUUID());
        sprint.setStatus(SprintStatus.ACTIVE);
        sprint.setEndDate(LocalDate.now().minusDays(1));

        when(sprintRepository.findByStatusAndEndDateBefore(SprintStatus.ACTIVE, LocalDate.now()))
                .thenReturn(List.of(sprint));

        scheduler.closeOverdueSprints();

        verify(sprintService).completeSprintInternal(sprint);
    }
}