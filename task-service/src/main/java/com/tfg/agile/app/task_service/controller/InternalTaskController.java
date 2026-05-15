package com.tfg.agile.app.task_service.controller;

import com.tfg.agile.app.task_service.service.TaskService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/internal/tasks")
public class InternalTaskController {

    private final TaskService taskService;

    public InternalTaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    @PutMapping("/{taskId}/story-points")
    public ResponseEntity<Void> updateStoryPoints(@PathVariable("taskId") UUID taskId,
                                                  @RequestBody Map<String, Integer> body) {
        Integer storyPoints = body.get("storyPoints");
        taskService.updateStoryPoints(taskId, storyPoints);
        return ResponseEntity.noContent().build();
    }
}