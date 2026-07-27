package com.tfg.agile.app.poker_service.config;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.assertj.core.api.Assertions.assertThat;

class DisconnectSchedulerTest {

    private DisconnectScheduler scheduler;

    @BeforeEach
    void setUp() {
        scheduler = new DisconnectScheduler();
    }

    @Test
    void schedule_executesTaskAfterDelay() throws InterruptedException {
        UUID userId = UUID.randomUUID();
        CountDownLatch latch = new CountDownLatch(1);

        scheduler.schedule(userId, latch::countDown);

        // The grace period is 8 seconds; wait up to 12 seconds for execution
        boolean executed = latch.await(12, TimeUnit.SECONDS);

        assertThat(executed).isTrue();
    }

    @Test
    void cancel_preventsExecution() throws InterruptedException {
        UUID userId = UUID.randomUUID();
        AtomicBoolean executed = new AtomicBoolean(false);

        scheduler.schedule(userId, () -> executed.set(true));
        scheduler.cancel(userId);

        // Wait a bit longer than the grace period to confirm it was cancelled
        Thread.sleep(10_000);

        assertThat(executed.get()).isFalse();
    }

    @Test
    void schedule_cancelsExistingPendingTask() throws InterruptedException {
        UUID userId = UUID.randomUUID();
        AtomicBoolean firstExecuted = new AtomicBoolean(false);
        CountDownLatch secondLatch = new CountDownLatch(1);

        scheduler.schedule(userId, () -> firstExecuted.set(true));
        // Scheduling again for the same userId should cancel the first task
        scheduler.schedule(userId, secondLatch::countDown);

        boolean secondExecuted = secondLatch.await(12, TimeUnit.SECONDS);

        assertThat(firstExecuted.get()).isFalse();
        assertThat(secondExecuted).isTrue();
    }
}