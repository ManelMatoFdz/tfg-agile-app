package com.tfg.agile.app.user_service.controller;

import com.tfg.agile.app.user_service.dto.MessageResponseDto;
import com.tfg.agile.app.user_service.dto.NotificationEnqueueRequestDto;
import com.tfg.agile.app.user_service.service.NotificationIngressService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/internal/notifications")
public class InternalNotificationController {

    private final NotificationIngressService notificationIngressService;

    public InternalNotificationController(NotificationIngressService notificationIngressService) {
        this.notificationIngressService = notificationIngressService;
    }

    @PostMapping("/enqueue")
    public MessageResponseDto enqueue(@RequestBody @Valid NotificationEnqueueRequestDto requestDto) {
        notificationIngressService.enqueue(requestDto);
        return new MessageResponseDto("Notification accepted");
    }
}
