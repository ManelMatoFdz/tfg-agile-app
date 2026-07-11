package com.tfg.agile.app.task_service.controller;

import com.tfg.agile.app.task_service.dto.CreateCommentRequestDto;
import com.tfg.agile.app.task_service.dto.TaskCommentDto;
import com.tfg.agile.app.task_service.dto.UpdateCommentRequestDto;
import com.tfg.agile.app.task_service.service.CommentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
public class CommentController {

    private final CommentService commentService;

    public CommentController(CommentService commentService) {
        this.commentService = commentService;
    }

    @GetMapping("/tasks/{taskId}/comments")
    public List<TaskCommentDto> listByTask(@PathVariable("taskId") UUID taskId,
                                           @AuthenticationPrincipal UUID callerId) {
        return commentService.findByTask(taskId, callerId);
    }

    @PostMapping("/tasks/{taskId}/comments")
    public ResponseEntity<TaskCommentDto> create(@PathVariable("taskId") UUID taskId,
                                                  @Valid @RequestBody CreateCommentRequestDto dto,
                                                  @AuthenticationPrincipal UUID callerId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(commentService.create(taskId, dto, callerId));
    }

    @PutMapping("/comments/{commentId}")
    public TaskCommentDto update(@PathVariable("commentId") UUID commentId,
                                 @Valid @RequestBody UpdateCommentRequestDto dto,
                                 @AuthenticationPrincipal UUID callerId) {
        return commentService.update(commentId, dto, callerId);
    }

    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<Void> delete(@PathVariable("commentId") UUID commentId,
                                        @AuthenticationPrincipal UUID callerId) {
        commentService.delete(commentId, callerId);
        return ResponseEntity.noContent().build();
    }
}