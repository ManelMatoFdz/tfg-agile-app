package com.tfg.agile.app.poker_service.config;

import org.springframework.stereotype.Component;

import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

/**
 * Delays WebSocket-disconnect processing to allow browser refreshes to
 * reconnect without briefly appearing offline. If the user calls joinSession
 * within the grace period the pending task is cancelled.
 */
@Component
public class DisconnectScheduler {

    private static final long GRACE_SECONDS = 8;

    private final ScheduledExecutorService executor = Executors.newSingleThreadScheduledExecutor();
    private final ConcurrentHashMap<UUID, ScheduledFuture<?>> pending = new ConcurrentHashMap<>();

    /** Schedule a disconnect task for userId; cancels any existing pending task first. */
    public void schedule(UUID userId, Runnable task) {
        cancel(userId);
        ScheduledFuture<?> future = executor.schedule(() -> {
            pending.remove(userId);
            task.run();
        }, GRACE_SECONDS, TimeUnit.SECONDS);
        pending.put(userId, future);
    }

    /** Cancel a pending disconnect (call when the user reconnects). */
    public void cancel(UUID userId) {
        ScheduledFuture<?> f = pending.remove(userId);
        if (f != null) f.cancel(false);
    }
}