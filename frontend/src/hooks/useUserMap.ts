import { useEffect, useState } from 'react';
import { usersApi } from '../api/users';
import type { UserSummary } from '../types';

/**
 * Resolves a list of user IDs to a Map<userId, UserSummary>.
 * Only fetches when the ids list is non-empty.
 */
export function useUserMap(ids: string[]): Map<string, UserSummary> {
  const [userMap, setUserMap] = useState<Map<string, UserSummary>>(new Map());

  useEffect(() => {
    if (ids.length === 0) return;
    usersApi.batch(ids).then((res) => {
      const map = new Map<string, UserSummary>();
      for (const u of res.data) {
        map.set(u.id, u);
      }
      setUserMap(map);
    }).catch(() => {
      // silently ignore — components will fall back to userId
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(',')]);

  return userMap;
}