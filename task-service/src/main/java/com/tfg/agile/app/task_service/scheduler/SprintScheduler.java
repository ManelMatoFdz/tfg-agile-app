package com.tfg.agile.app.task_service.scheduler;

import com.tfg.agile.app.task_service.entity.Sprint;
import com.tfg.agile.app.task_service.entity.SprintStatus;
import com.tfg.agile.app.task_service.repository.SprintRepository;
import com.tfg.agile.app.task_service.service.SprintService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

@Component
public class SprintScheduler {

    private static final Logger log = LoggerFactory.getLogger(SprintScheduler.class);

    private final SprintRepository sprintRepository;
    private final SprintService sprintService;

    public SprintScheduler(SprintRepository sprintRepository, SprintService sprintService) {
        this.sprintRepository = sprintRepository;
        this.sprintService = sprintService;
    }

    @Scheduled(cron = "0 0 0 * * *")
    public void autoStartSprints() {
        List<Sprint> ready = sprintRepository.findByStatusAndStartDateLessThanEqual(
                SprintStatus.PLANNING, LocalDate.now());

        int activated = 0;
        for (Sprint sprint : ready) {
            try {
                if (sprintService.activateSprintInternal(sprint)) {
                    activated++;
                    log.info("Auto-started sprint '{}' (id={}, project={})",
                            sprint.getName(), sprint.getId(), sprint.getProjectId());
                } else {
                    log.info("Skipped auto-start for sprint '{}' (id={}) — another sprint is already active for project {}",
                            sprint.getName(), sprint.getId(), sprint.getProjectId());
                }
            } catch (Exception e) {
                log.error("Failed to auto-start sprint '{}' (id={}): {}",
                        sprint.getName(), sprint.getId(), e.getMessage(), e);
            }
        }

        if (activated > 0) {
            log.info("Sprint auto-start: {} sprint(s) activated", activated);
        }
    }

    @Scheduled(cron = "0 0 0 * * *")
    public void closeOverdueSprints() {
        List<Sprint> overdue = sprintRepository.findByStatusAndEndDateBefore(
                SprintStatus.ACTIVE, LocalDate.now());

        for (Sprint sprint : overdue) {
            try {
                sprintService.completeSprintInternal(sprint);
                log.info("Auto-closed sprint '{}' (id={}, project={})",
                        sprint.getName(), sprint.getId(), sprint.getProjectId());
            } catch (Exception e) {
                log.error("Failed to auto-close sprint '{}' (id={}): {}",
                        sprint.getName(), sprint.getId(), e.getMessage(), e);
            }
        }

        if (!overdue.isEmpty()) {
            log.info("Sprint auto-close: {} sprint(s) processed", overdue.size());
        }
    }
}