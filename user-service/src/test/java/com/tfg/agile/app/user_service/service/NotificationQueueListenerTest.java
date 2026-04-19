package com.tfg.agile.app.user_service.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class NotificationQueueListenerTest {

    @Mock
    private NotificationProcessingService notificationProcessingService;

    @Test
    void onMessage_delegatesToNotificationProcessingService() {
        NotificationQueueListener listener = new NotificationQueueListener(notificationProcessingService);
        NotificationQueueMessage message = new NotificationQueueMessage();

        listener.onMessage(message);

        verify(notificationProcessingService).process(message);
    }
}

