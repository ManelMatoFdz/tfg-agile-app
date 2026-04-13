package com.tfg.agile.app.user_service.service;

import com.tfg.agile.app.user_service.dto.NotificationEnqueueRequestDto;
import com.tfg.agile.app.user_service.support.TestDataFactory;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationIngressServiceTest {

    @Mock
    private NotificationProcessingService notificationProcessingService;
    @Mock
    private NotificationQueuePublisher notificationQueuePublisher;
    @Mock
    private ObjectProvider<NotificationQueuePublisher> notificationQueuePublisherProvider;

    @Test
    void enqueue_whenQueueDisabled_processesInline() {
        when(notificationQueuePublisherProvider.getIfAvailable()).thenReturn(notificationQueuePublisher);
        NotificationIngressService service = new NotificationIngressService(
                notificationProcessingService,
                notificationQueuePublisherProvider,
                false
        );

        NotificationEnqueueRequestDto request = TestDataFactory.notificationEnqueueRequestDto(UUID.randomUUID());

        service.enqueue(request);

        ArgumentCaptor<NotificationQueueMessage> messageCaptor = ArgumentCaptor.forClass(NotificationQueueMessage.class);
        verify(notificationProcessingService).process(messageCaptor.capture());
        verify(notificationQueuePublisher, never()).publish(messageCaptor.getValue());
        assertThat(messageCaptor.getValue().getUserId()).isEqualTo(request.getUserId());
        assertThat(messageCaptor.getValue().getTitle()).isEqualTo(request.getTitle());
    }

    @Test
    void enqueue_whenQueueEnabledWithoutPublisher_processesInline() {
        when(notificationQueuePublisherProvider.getIfAvailable()).thenReturn(null);
        NotificationIngressService service = new NotificationIngressService(
                notificationProcessingService,
                notificationQueuePublisherProvider,
                true
        );

        NotificationEnqueueRequestDto request = TestDataFactory.notificationEnqueueRequestDto(UUID.randomUUID());

        service.enqueue(request);

        verify(notificationProcessingService).process(org.mockito.ArgumentMatchers.any(NotificationQueueMessage.class));
    }

    @Test
    void enqueue_whenQueueEnabledWithPublisher_publishesToQueue() {
        when(notificationQueuePublisherProvider.getIfAvailable()).thenReturn(notificationQueuePublisher);
        NotificationIngressService service = new NotificationIngressService(
                notificationProcessingService,
                notificationQueuePublisherProvider,
                true
        );

        NotificationEnqueueRequestDto request = TestDataFactory.notificationEnqueueRequestDto(UUID.randomUUID());

        service.enqueue(request);

        ArgumentCaptor<NotificationQueueMessage> messageCaptor = ArgumentCaptor.forClass(NotificationQueueMessage.class);
        verify(notificationQueuePublisher).publish(messageCaptor.capture());
        verify(notificationProcessingService, never()).process(messageCaptor.getValue());
        assertThat(messageCaptor.getValue().getType()).isEqualTo("PROJECT_UPDATE");
    }
}

