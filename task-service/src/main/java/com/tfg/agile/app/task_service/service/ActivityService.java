package com.tfg.agile.app.task_service.service;

import com.tfg.agile.app.task_service.dto.TaskActivityDto;
import com.tfg.agile.app.task_service.entity.TaskActivity;
import com.tfg.agile.app.task_service.entity.TaskActivityType;
import com.tfg.agile.app.task_service.repository.TaskActivityRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class ActivityService {

    private final TaskActivityRepository activityRepository;

    public ActivityService(TaskActivityRepository activityRepository) {
        this.activityRepository = activityRepository;
    }

    @Transactional(readOnly = true)
    public List<TaskActivityDto> findByTask(UUID taskId) {
        return activityRepository.findByTaskIdOrderByCreatedAtAsc(taskId).stream()
                .map(TaskActivityDto::from)
                .toList();
    }

    @Transactional
    public void record(UUID taskId, UUID actorId, TaskActivityType type,
                       String oldValue, String newValue) {
        TaskActivity activity = TaskActivity.builder()
                .taskId(taskId)
                .actorId(actorId)
                .type(type)
                .oldValue(oldValue)
                .newValue(newValue)
                .build();
        activityRepository.save(activity);
    }
}