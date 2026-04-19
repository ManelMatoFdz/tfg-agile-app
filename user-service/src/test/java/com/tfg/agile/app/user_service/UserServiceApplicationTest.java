package com.tfg.agile.app.user_service;

import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;
import org.springframework.boot.SpringApplication;

import static org.mockito.Mockito.mockStatic;

class UserServiceApplicationTest {

    @Test
    void main_delegatesToSpringApplicationRun() {
        try (MockedStatic<SpringApplication> mockedSpringApplication = mockStatic(SpringApplication.class)) {
            UserServiceApplication.main(new String[]{"--spring.main.web-application-type=none"});

            mockedSpringApplication.verify(() -> SpringApplication.run(UserServiceApplication.class, new String[]{"--spring.main.web-application-type=none"}));
        }
    }
}

