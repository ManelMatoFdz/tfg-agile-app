import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '../api/users';
import type { Notification, UserSummary } from '../types';
import { notificationActorId } from '../utils/notificationMeta';

export function useNotificationActors(notifications: Notification[]): Record<string, UserSummary> {
  const actorIds = useMemo(() => Array.from(new Set(
    notifications
      .map(notificationActorId)
      .filter((id): id is string => id !== null),
  )).sort(), [notifications]);

  const { data = [] } = useQuery({
    queryKey: ['notification-actors', actorIds],
    queryFn: async () => (await usersApi.batch(actorIds)).data,
    enabled: actorIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  return useMemo(() => {
    const actors: Record<string, UserSummary> = {};
    for (const actor of data) actors[actor.id] = actor;
    return actors;
  }, [data]);
}
