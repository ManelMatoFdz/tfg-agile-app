package com.tfg.agile.app.task_service.controller;

import com.tfg.agile.app.task_service.entity.GitEvent;
import com.tfg.agile.app.task_service.entity.GitIntegration;
import com.tfg.agile.app.task_service.entity.Task;
import com.tfg.agile.app.task_service.repository.GitEventRepository;
import com.tfg.agile.app.task_service.repository.GitIntegrationRepository;
import com.tfg.agile.app.task_service.repository.TaskRepository;
import com.tfg.agile.app.task_service.support.IntegrationTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class GitWebhookControllerIT extends IntegrationTestBase {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private GitIntegrationRepository gitIntegrationRepository;

    @Autowired
    private GitEventRepository gitEventRepository;

    @Test
    void taskEndpointsStillRequireJwt() {
        Task task = taskRepository.save(Task.builder()
                .projectId(UUID.randomUUID())
                .title("Investigate webhook")
                .reporterId(UUID.randomUUID())
                .build());

        ResponseEntity<String> response = restTemplate.getForEntity("/tasks/{taskId}", String.class, task.getId());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void internalStoryPointsEndpointRequiresInternalApiKeyAndUpdatesTask() {
        Task task = taskRepository.save(Task.builder()
                .projectId(UUID.randomUUID())
                .title("Estimate story")
                .reporterId(UUID.randomUUID())
                .build());

        ResponseEntity<String> unauthorized = restTemplate.exchange(
                "/internal/tasks/{taskId}/story-points",
                HttpMethod.PUT,
                new HttpEntity<>(Map.of("storyPoints", 8)),
                String.class,
                task.getId()
        );

        assertThat(unauthorized.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);

        HttpHeaders headers = new HttpHeaders();
        headers.add("X-Internal-Api-Key", "test-internal-key");
        ResponseEntity<Void> authorized = restTemplate.exchange(
                "/internal/tasks/{taskId}/story-points",
                HttpMethod.PUT,
                new HttpEntity<>(Map.of("storyPoints", 8), headers),
                Void.class,
                task.getId()
        );

        assertThat(authorized.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(taskRepository.findById(task.getId())).get()
                .extracting(Task::getStoryPoints)
                .isEqualTo(8);
    }

    @Test
    void webhookRejectsInvalidSignature() {
        UUID projectId = UUID.randomUUID();
        gitIntegrationRepository.save(GitIntegration.builder()
                .projectId(projectId)
                .repositoryUrl("https://github.com/acme/kadenza")
                .webhookSecret("top-secret")
                .createdBy(UUID.randomUUID())
                .build());

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.add("X-GitHub-Event", "push");
        headers.add("X-Hub-Signature-256", "sha256=bad");

        ResponseEntity<String> response = restTemplate.exchange(
                "/webhooks/github/{projectId}",
                HttpMethod.POST,
                new HttpEntity<>("{\"ref\":\"refs/heads/main\",\"commits\":[]}".getBytes(StandardCharsets.UTF_8), headers),
                String.class,
                projectId
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(gitEventRepository.findByProjectIdOrderByReceivedAtDesc(projectId)).isEmpty();
    }

    @Test
    void webhookStoresCommitEventWhenSignatureAndTaskReferenceAreValid() throws Exception {
        UUID projectId = UUID.randomUUID();
        Task task = taskRepository.save(Task.builder()
                .projectId(projectId)
                .title("Pantalla de repositorio")
                .reporterId(UUID.randomUUID())
                .build());
        String secret = "top-secret";
        gitIntegrationRepository.save(GitIntegration.builder()
                .projectId(projectId)
                .repositoryUrl("https://github.com/acme/kadenza")
                .webhookSecret(secret)
                .createdBy(UUID.randomUUID())
                .build());

        String payload = """
                {
                  "ref":"refs/heads/feature/TASK-%s",
                  "sender":{"login":"ada"},
                  "commits":[
                    {
                      "id":"abc123",
                      "url":"https://github.com/acme/kadenza/commit/abc123",
                      "message":"Implement TASK-%s repository page"
                    }
                  ]
                }
                """.formatted(task.getId().toString().substring(0, 8), task.getId().toString().substring(0, 8));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.add("X-GitHub-Event", "push");
        headers.add("X-Hub-Signature-256", hmac(secret, payload));

        ResponseEntity<Map> response = restTemplate.exchange(
                "/webhooks/github/{projectId}",
                HttpMethod.POST,
                new HttpEntity<>(payload.getBytes(StandardCharsets.UTF_8), headers),
                Map.class,
                projectId
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).containsEntry("eventsStored", 1);
        GitEvent event = gitEventRepository.findByProjectIdOrderByReceivedAtDesc(projectId).getFirst();
        assertThat(event.getTaskId()).isEqualTo(task.getId());
        assertThat(event.getExternalId()).isEqualTo("abc123");
        assertThat(event.getTitle()).isEqualTo("Implement TASK-%s repository page".formatted(task.getId().toString().substring(0, 8)));
    }

    private static String hmac(String secret, String payload) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        byte[] digest = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
        StringBuilder hex = new StringBuilder(digest.length * 2);
        for (byte b : digest) {
            hex.append(Character.forDigit((b >> 4) & 0xF, 16));
            hex.append(Character.forDigit(b & 0xF, 16));
        }
        return "sha256=" + hex;
    }
}
