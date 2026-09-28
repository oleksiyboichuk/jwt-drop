import { CACHE_CLEANUP_INTERVAL_MS } from "./config.js";

const invalidatedSessions = new Map<string, number>();

export function addInvalidatedSession(sessionId: string, expiration: number): void {
  invalidatedSessions.set(sessionId, expiration);
}

export function isSessionInvalidated(sessionId: string): boolean {
  const expiration = invalidatedSessions.get(sessionId);
  if (!expiration) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  if (expiration <= now) {
    invalidatedSessions.delete(sessionId);
    return false;
  }

  return true;
}

export function pruneExpiredSessions(): number {
  const now = Math.floor(Date.now() / 1000);
  let removedCount = 0;

  for (const [sessionId, expiration] of invalidatedSessions.entries()) {
    if (expiration <= now) {
      invalidatedSessions.delete(sessionId);
      removedCount++;
    }
  }

  return removedCount;
}

export function startPeriodicPruning(intervalMs = CACHE_CLEANUP_INTERVAL_MS): NodeJS.Timeout {
  return setInterval(() => {
    const removed = pruneExpiredSessions();
    if (removed > 0) {
      console.log(`[cache] Pruned ${removed} expired session(s)`);
    }
  }, intervalMs);
}
