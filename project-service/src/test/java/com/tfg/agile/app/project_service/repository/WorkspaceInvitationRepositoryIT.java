package com.tfg.agile.app.project_service.repository;

import com.tfg.agile.app.project_service.FlywayMigrationConfig;
import com.tfg.agile.app.project_service.entity.InvitationStatus;
import com.tfg.agile.app.project_service.entity.Workspace;
import com.tfg.agile.app.project_service.entity.WorkspaceInvitation;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Testcontainers
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(FlywayMigrationConfig.class)
class WorkspaceInvitationRepositoryIT {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    private WorkspaceRepository workspaceRepository;

    @Autowired
    private WorkspaceInvitationRepository invitationRepository;

    @Test
    void repositoryFindsAndDeletesPendingInvitationsByBusinessKey() {
        Workspace workspace = workspaceRepository.save(Workspace.builder()
                .name("Acme")
                .description("Main workspace")
                .ownerId(UUID.randomUUID())
                .build());
        UUID invitedUserId = UUID.randomUUID();

        WorkspaceInvitation invitation = invitationRepository.save(WorkspaceInvitation.builder()
                .workspace(workspace)
                .invitedEmail("ada@example.com")
                .invitedUserId(invitedUserId)
                .invitedByUserId(UUID.randomUUID())
                .status(InvitationStatus.PENDING)
                .build());

        assertThat(invitationRepository.existsByWorkspaceIdAndInvitedEmailAndStatus(
                workspace.getId(), "ada@example.com", InvitationStatus.PENDING)).isTrue();
        assertThat(invitationRepository.findByIdAndInvitedUserId(invitation.getId(), invitedUserId))
                .contains(invitation);

        invitationRepository.deleteByWorkspaceIdAndInvitedEmailAndStatus(
                workspace.getId(), "ada@example.com", InvitationStatus.PENDING);

        assertThat(invitationRepository.findById(invitation.getId())).isEmpty();
    }
}
