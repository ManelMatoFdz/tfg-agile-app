package com.tfg.agile.app.task_service.support;

import com.tfg.agile.app.task_service.client.MemberPermissionsDto;
import com.tfg.agile.app.task_service.entity.Sprint;
import com.tfg.agile.app.task_service.entity.SprintStatus;
import com.tfg.agile.app.task_service.entity.Task;
import com.tfg.agile.app.task_service.entity.TaskPriority;
import com.tfg.agile.app.task_service.entity.TaskStatus;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public final class TestDataFactory {

    private TestDataFactory() {
    }

    public static MemberPermissionsDto adminPermissions() {
        return new MemberPermissionsDto("ADMIN", null);
    }

    public static MemberPermissionsDto memberPermissions() {
        return new MemberPermissionsDto("MEMBER", null);
    }

    public static MemberPermissionsDto viewerPermissions() {
        return new MemberPermissionsDto("VIEWER", null);
    }

    public static MemberPermissionsDto scrumMasterPermissions() {
        return new MemberPermissionsDto("MEMBER", "SCRUM_MASTER");
    }

    public static MemberPermissionsDto productOwnerPermissions() {
        return new MemberPermissionsDto("MEMBER", "PRODUCT_OWNER");
    }

    public static Task task(UUID projectId, UUID reporterId) {
        Instant now = Instant.now();
        return Task.builder()
                .id(UUID.randomUUID())
                .projectId(projectId)
                .title("Task title")
                .description("Task description")
                .status(TaskStatus.TODO)
                .priority(TaskPriority.MEDIUM)
                .reporterId(reporterId)
                .position(0)
                .createdAt(now)
                .updatedAt(now)
                .build();
    }

    public static Sprint sprint(UUID projectId) {
        Instant now = Instant.now();
        return Sprint.builder()
                .id(UUID.randomUUID())
                .projectId(projectId)
                .name("Sprint 1")
                .goal("Ship MVP")
                .status(SprintStatus.PLANNING)
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusDays(14))
                .createdAt(now)
                .updatedAt(now)
                .build();
    }
}

