package com.tfg.agile.app.task_service.controller;

import com.tfg.agile.app.task_service.dto.*;
import com.tfg.agile.app.task_service.service.ActivityService;
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
    private final ActivityService activityService;

    public TaskController(TaskService taskService, ActivityService activityService) {
        this.taskService = taskService;
        this.activityService = activityService;
    }

    @GetMapping("/tasks/my-tasks")
    public List<TaskResponseDto> myTasks(@AuthenticationPrincipal UUID callerId) {
        return taskService.findMyTasks(callerId);
    }

    @GetMapping("/projects/{projectId}/tasks")
    public List<TaskResponseDto> listByProject(@PathVariable("projectId") UUID projectId,
                                               @AuthenticationPrincipal UUID callerId) {
        return taskService.findByProject(projectId, callerId);
    }

    @GetMapping("/tasks/{taskId}")
    public TaskResponseDto getById(@PathVariable("taskId") UUID taskId,
                                   @AuthenticationPrincipal UUID callerId) {
        return taskService.findById(taskId, callerId);
    }

    @PostMapping("/projects/{projectId}/tasks")
    public ResponseEntity<TaskResponseDto> create(@PathVariable("projectId") UUID projectId,
                                                  @Valid @RequestBody CreateTaskRequestDto dto,
                                                  @AuthenticationPrincipal UUID callerId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(taskService.create(projectId, dto, callerId));
    }

    @PutMapping("/tasks/{taskId}")
    public TaskResponseDto update(@PathVariable("taskId") UUID taskId,
                                  @Valid @RequestBody UpdateTaskRequestDto dto,
                                  @AuthenticationPrincipal UUID callerId) {
        return taskService.update(taskId, dto, callerId);
    }

    @PatchMapping("/tasks/{taskId}/move")
    public TaskResponseDto move(@PathVariable("taskId") UUID taskId,
                                @Valid @RequestBody MoveTaskRequestDto dto,
                                @AuthenticationPrincipal UUID callerId) {
        return taskService.move(taskId, dto, callerId);
    }

    @PatchMapping("/tasks/{taskId}/toggle-done")
    public TaskResponseDto toggleDone(@PathVariable("taskId") UUID taskId,
                                      @AuthenticationPrincipal UUID callerId) {
        return taskService.toggleSubtaskDone(taskId, callerId);
    }

    @GetMapping("/tasks/{taskId}/subtasks")
    public List<TaskResponseDto> getSubtasks(@PathVariable("taskId") UUID taskId,
                                             @AuthenticationPrincipal UUID callerId) {
        return taskService.getSubtasks(taskId, callerId);
    }

    @DeleteMapping("/tasks/{taskId}")
    public ResponseEntity<Void> delete(@PathVariable("taskId") UUID taskId,
                                       @AuthenticationPrincipal UUID callerId) {
        taskService.delete(taskId, callerId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/tasks/{taskId}/activity")
    public List<TaskActivityDto> getActivity(@PathVariable("taskId") UUID taskId,
                                             @AuthenticationPrincipal UUID callerId) {
        taskService.findById(taskId, callerId); // permission check
        return activityService.findByTask(taskId);
    }
}