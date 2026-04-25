            mockedSpringApplication.verify(() ->
                    SpringApplication.run(PokerServiceApplication.class, new String[]{"--spring.main.web-application-type=none"}));
package com.tfg.agile.app.poker_service;

import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;
import org.springframework.boot.SpringApplication;

import static org.mockito.Mockito.mockStatic;

class PokerServiceApplicationTest {

    @Test
    void main_delegatesToSpringApplicationRun() {
        try (MockedStatic<SpringApplication> mockedSpringApplication = mockStatic(SpringApplication.class)) {
            PokerServiceApplication.main(args);

            PokerServiceApplication.main(new String[]{"--spring.main.web-application-type=none"});

        try (MockedStatic<SpringApplication> mockedSpringApplication = mockStatic(SpringApplication.class)) {
            PokerServiceApplication.main(args);

            mockedSpringApplication.verify(() -> SpringApplication.run(PokerServiceApplication.class, args));
        }
    }
}

