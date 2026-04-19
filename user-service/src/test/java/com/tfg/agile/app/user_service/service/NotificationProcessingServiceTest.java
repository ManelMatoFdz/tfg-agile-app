package com.tfg.agile.app.user_service.service;

import com.tfg.agile.app.user_service.entity.Notification;
import com.tfg.agile.app.user_service.entity.NotificationSettings;
import com.tfg.agile.app.user_service.entity.User;
import com.tfg.agile.app.user_service.repository.NotificationRepository;
import com.tfg.agile.app.user_service.repository.NotificationSettingsRepository;
import com.tfg.agile.app.user_service.repository.UserRepository;
import com.tfg.agile.app.user_service.support.TestDataFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationProcessingServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private NotificationSettingsRepository notificationSettingsRepository;
    @Mock
    private NotificationRepository notificationRepository;
    @Mock
    private NotificationEmailSender notificationEmailSender;

    private NotificationProcessingService service;

    @BeforeEach
    void setUp() {
        service = new NotificationProcessingService(
                userRepository,
                notificationSettingsRepository,
                notificationRepository,
                notificationEmailSender
        );
    }

    @Test
    void process_ignoresMessageWhenUserDoesNotExist() {
        NotificationQueueMessage message = new NotificationQueueMessage();
        when(userRepository.findById(any())).thenReturn(Optional.empty());

        service.process(message);

        verify(notificationSettingsRepository, never()).findByUserId(any());
        verify(notificationRepository, never()).save(any());
        verify(notificationEmailSender, never()).sendNotification(anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void process_createsDefaultSettingsAndSendsInAppAndEmail() {
        User user = TestDataFactory.user();
        NotificationQueueMessage message = new NotificationQueueMessage(user.getId(), "  Sprint updated  ", "  Story moved  ", " project_update ", "  /projects/123  ");

        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(notificationSettingsRepository.findByUserId(user.getId())).thenReturn(Optional.empty());
        when(notificationSettingsRepository.save(any(NotificationSettings.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.process(message);

        verify(notificationSettingsRepository).save(any(NotificationSettings.class));

        ArgumentCaptor<Notification> notificationCaptor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(notificationCaptor.capture());
        Notification notification = notificationCaptor.getValue();
        assertThat(notification.getType()).isEqualTo("PROJECT_UPDATE");
        assertThat(notification.getTitle()).isEqualTo("Sprint updated");
        assertThat(notification.getMessage()).isEqualTo("Story moved");
        assertThat(notification.getLink()).isEqualTo("/projects/123");
        assertThat(notification.isRead()).isFalse();

        verify(notificationEmailSender).sendNotification(
                user.getEmail(),
                "Sprint updated",
                "Story moved",
                "  /projects/123  "
        );
    }

    @Test
    void process_skipsNotificationWhenProjectUpdatesAreDisabled() {
        User user = TestDataFactory.user();
        NotificationSettings settings = TestDataFactory.notificationSettings(user);
        settings.setProjectUpdatesEnabled(false);

        NotificationQueueMessage message = new NotificationQueueMessage(user.getId(), "Title", "Message", "PROJECT_UPDATE", "/project");

        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(notificationSettingsRepository.findByUserId(user.getId())).thenReturn(Optional.of(settings));

        service.process(message);

        verify(notificationRepository, never()).save(any());
        verify(notificationEmailSender, never()).sendNotification(anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void process_skipsTaskReminderWhenTaskRemindersAreDisabled() {
        User user = TestDataFactory.user();
        NotificationSettings settings = TestDataFactory.notificationSettings(user);
        settings.setTaskRemindersEnabled(false);

        NotificationQueueMessage message = new NotificationQueueMessage(user.getId(), "Title", "Message", "task_reminder", null);

        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(notificationSettingsRepository.findByUserId(user.getId())).thenReturn(Optional.of(settings));

        service.process(message);

        verify(notificationRepository, never()).save(any());
        verify(notificationEmailSender, never()).sendNotification(anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void process_normalizesBlankTypeTitleMessageAndLink() {
        User user = TestDataFactory.user();
        NotificationSettings settings = TestDataFactory.notificationSettings(user);
        settings.setEmailNotificationsEnabled(false);

        NotificationQueueMessage message = new NotificationQueueMessage(user.getId(), "  ", "", "   ", "   ");

        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(notificationSettingsRepository.findByUserId(user.getId())).thenReturn(Optional.of(settings));

        service.process(message);

        ArgumentCaptor<Notification> notificationCaptor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(notificationCaptor.capture());
        Notification notification = notificationCaptor.getValue();

        assertThat(notification.getType()).isEqualTo("GENERAL");
        assertThat(notification.getTitle()).isEqualTo("Notification");
        assertThat(notification.getMessage()).isEqualTo("You have a new notification.");
        assertThat(notification.getLink()).isNull();

        verify(notificationEmailSender, never()).sendNotification(anyString(), anyString(), anyString(), anyString());
    }
}

