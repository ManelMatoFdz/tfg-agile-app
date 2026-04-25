package com.tfg.agile.app.task_service.controller;

import com.tfg.agile.app.task_service.dto.*;
import com.tfg.agile.app.task_service.service.TaskService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
public class TaskController {

    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    @GetMapping("/tasks/my-tasks")
    public List<TaskResponseDto> myTasks(@AuthenticationPrincipal UUID callerId) {
        return taskService.findMyTasks(callerId);
    }

    @GetMapping("/projects/{projectId}/tasks")
    public List<TaskResponseDto> listByProject(@PathVariable UUID projectId,
                                               @AuthenticationPrincipal UUID callerId) {
        return taskService.findByProject(projectId, callerId);
    }

    @GetMapping("/tasks/{taskId}")
    public TaskResponseDto getById(@PathVariable UUID taskId,
                                   @AuthenticationPrincipal UUID callerId) {
        return taskService.findById(taskId, callerId);
    }

    @PostMapping("/projects/{projectId}/tasks")
    public ResponseEntity<TaskResponseDto> create(@PathVariable UUID projectId,
                                                  @Valid @RequestBody CreateTaskRequestDto dto,
                                                  @AuthenticationPrincipal UUID callerId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(taskService.create(projectId, dto, callerId));
    }

    @PutMapping("/tasks/{taskId}")
    public TaskResponseDto update(@PathVariable UUID taskId,
                                  @Valid @RequestBody UpdateTaskRequestDto dto,
                                  @AuthenticationPrincipal UUID callerId) {
        return taskService.update(taskId, dto, callerId);
    }

    @PatchMapping("/tasks/{taskId}/move")
    public TaskResponseDto move(@PathVariable UUID taskId,
                                @Valid @RequestBody MoveTaskRequestDto dto,
                                @AuthenticationPrincipal UUID callerId) {
        return taskService.move(taskId, dto, callerId);
    }

    @DeleteMapping("/tasks/{taskId}")
    public ResponseEntity<Void> delete(@PathVariable UUID taskId,
                                       @AuthenticationPrincipal UUID callerId) {
        taskService.delete(taskId, callerId);
        return ResponseEntity.noContent().build();
    }
}