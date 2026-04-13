const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';

const AVATAR_PATH_PREFIX = '/assets/avatars/';

export function buildAvatarSrc(avatarUrl?: string, updatedAt?: string): string | null {
  if (!avatarUrl) return null;

  const normalized = toApiRelativeAvatarPath(avatarUrl);
  const cacheKey = updatedAt ? encodeURIComponent(updatedAt) : null;

  if (!cacheKey) return normalized;
  return `${normalized}${normalized.includes('?') ? '&' : '?'}v=${cacheKey}`;
}

function toApiRelativeAvatarPath(avatarUrl: string): string {
  const path = extractAvatarPath(avatarUrl);
  if (!path) return avatarUrl;
  return `${API_BASE}${path}`;
}

function extractAvatarPath(avatarUrl: string): string | null {
  if (avatarUrl.startsWith(AVATAR_PATH_PREFIX)) {
    return avatarUrl;
  }

  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
    try {
      const parsed = new URL(avatarUrl);
      if (parsed.pathname.startsWith(AVATAR_PATH_PREFIX)) {
        return `${parsed.pathname}${parsed.search}`;
      }
    } catch {
      return null;
    }
  }

  return null;
}

