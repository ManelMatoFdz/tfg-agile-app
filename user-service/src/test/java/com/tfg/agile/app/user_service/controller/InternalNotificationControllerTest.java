package com.tfg.agile.app.user_service.controller;

import com.tfg.agile.app.user_service.dto.MessageResponseDto;
import com.tfg.agile.app.user_service.dto.NotificationEnqueueRequestDto;
import com.tfg.agile.app.user_service.service.NotificationIngressService;
import com.tfg.agile.app.user_service.support.TestDataFactory;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class InternalNotificationControllerTest {

    @Mock
    private NotificationIngressService notificationIngressService;

    @Test
    void enqueue_delegatesToIngressServiceAndReturnsAcceptedMessage() {
        InternalNotificationController controller = new InternalNotificationController(notificationIngressService);
        NotificationEnqueueRequestDto request = TestDataFactory.notificationEnqueueRequestDto(UUID.randomUUID());

        MessageResponseDto response = controller.enqueue(request);

        assertThat(response.getMessage()).isEqualTo("Notification accepted");
        verify(notificationIngressService).enqueue(request);
    }
}

