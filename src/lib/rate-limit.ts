const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

type Entry = { count: number; resetAt: number };

const attempts = new Map<string, Entry>();

function sweep() {
  const now = Date.now();
  if (attempts.size < 500) return;
  for (const [key, entry] of attempts.entries()) {
    if (entry.resetAt <= now) attempts.delete(key);
  }
}

export function checkLoginAllowed(key: string): boolean {
  sweep();
  const entry = attempts.get(key.toLowerCase());
  if (!entry) return true;
  if (entry.resetAt <= Date.now()) {
    attempts.delete(key.toLowerCase());
    return true;
  }
  return entry.count < MAX_ATTEMPTS;
}

export function registerLoginFailure(key: string): void {
  const normalized = key.toLowerCase();
  const now = Date.now();
  const existing = attempts.get(normalized);
  if (!existing || existing.resetAt <= now) {
    attempts.set(normalized, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  existing.count += 1;
  attempts.set(normalized, existing);
}

export function resetLoginAttempts(key: string): void {
  attempts.delete(key.toLowerCase());
}

export const LOGIN_RATE_LIMIT = { windowMs: WINDOW_MS, maxAttempts: MAX_ATTEMPTS };
