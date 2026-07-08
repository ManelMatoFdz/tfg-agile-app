package com.tfg.agile.app.task_service.controller;

import com.tfg.agile.app.task_service.service.BoardColumnService;
import com.tfg.agile.app.task_service.service.TaskService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/internal")
public class InternalTaskController {

    private final TaskService taskService;
    private final BoardColumnService boardColumnService;

    public InternalTaskController(TaskService taskService, BoardColumnService boardColumnService) {
        this.taskService = taskService;
        this.boardColumnService = boardColumnService;
    }

    @PutMapping("/tasks/{taskId}/story-points")
    public ResponseEntity<Void> updateStoryPoints(@PathVariable("taskId") UUID taskId,
                                                  @RequestBody Map<String, Integer> body) {
        Integer storyPoints = body.get("storyPoints");
        taskService.updateStoryPoints(taskId, storyPoints);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/projects/{projectId}/init-board")
    public ResponseEntity<Void> initBoard(@PathVariable("projectId") UUID projectId) {
        boardColumnService.createDefaultColumns(projectId);
        return ResponseEntity.noContent().build();
    }
}