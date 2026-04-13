const FLASH_NOTICE_KEY = 'auth.flashNotice';

export function setFlashNotice(message: string): void {
  sessionStorage.setItem(FLASH_NOTICE_KEY, message);
}

export function consumeFlashNotice(): string | null {
  const message = sessionStorage.getItem(FLASH_NOTICE_KEY);
  if (!message) return null;
  sessionStorage.removeItem(FLASH_NOTICE_KEY);
  return message;
}

