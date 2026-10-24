// Dopo troppi tentativi sbagliati lo stesso nome utente resta bloccato per qualche minuto.
// In memoria: basta per un programma con pochi utenti su un solo server.

const MAX_FAILURES = 5;
const LOCK_MS = 5 * 60 * 1000;

type Entry = { failures: number; lockedUntil: number };
const entries = new Map<string, Entry>();

export function lockedMinutes(key: string, now = Date.now()): number {
  const entry = entries.get(key);
  if (!entry || entry.lockedUntil <= now) return 0;
  return Math.ceil((entry.lockedUntil - now) / 60000);
}

export function recordFailure(key: string, now = Date.now()) {
  const entry = entries.get(key) ?? { failures: 0, lockedUntil: 0 };
  entry.failures += 1;
  if (entry.failures >= MAX_FAILURES) {
    entry.failures = 0;
    entry.lockedUntil = now + LOCK_MS;
  }
  entries.set(key, entry);
}

export function recordSuccess(key: string) {
  entries.delete(key);
}
