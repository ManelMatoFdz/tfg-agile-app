package com.tfg.agile.app.task_service;

import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;
import org.springframework.boot.SpringApplication;

import static org.mockito.Mockito.mockStatic;

class TaskServiceApplicationTest {

    @Test
    void main_delegatesToSpringApplicationRun() {
        try (MockedStatic<SpringApplication> mockedSpringApplication = mockStatic(SpringApplication.class)) {
            TaskServiceApplication.main(new String[]{"--spring.main.web-application-type=none"});

            mockedSpringApplication.verify(() ->
                    SpringApplication.run(TaskServiceApplication.class, new String[]{"--spring.main.web-application-type=none"}));
        }
    }
}

