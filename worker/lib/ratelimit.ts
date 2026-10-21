/**
 * Fixed-window rate limiter stored in D1 (consistent across all Cloudflare locations).
 * Used only on low-volume sensitive endpoints (login, forms, password reset), so the
 * write cost is negligible against the free tier's 100k writes/day.
 */
export async function hit(db: D1Database, key: string, limit: number, windowSec: number): Promise<{ allowed: boolean; remaining: number; retryAfter: number }> {
  const now = Math.floor(Date.now() / 1000);
  const cutoff = now - windowSec;
  const row = await db
    .prepare(
      `INSERT INTO rate_limits (key, count, window_start) VALUES (?1, 1, ?2)
       ON CONFLICT(key) DO UPDATE SET
         count = CASE WHEN window_start <= ?3 THEN 1 ELSE count + 1 END,
         window_start = CASE WHEN window_start <= ?3 THEN ?2 ELSE window_start END
       RETURNING count, window_start`,
    )
    .bind(key, now, cutoff)
    .first<{ count: number; window_start: number }>();
  const count = row?.count ?? 1;
  const start = row?.window_start ?? now;
  return { allowed: count <= limit, remaining: Math.max(0, limit - count), retryAfter: Math.max(1, start + windowSec - now) };
}

/** Occasionally prune expired rows (called from low-traffic admin paths). */
export async function pruneRateLimits(db: D1Database, olderThanSec = 86400): Promise<void> {
  await db
    .prepare("DELETE FROM rate_limits WHERE window_start < ?")
    .bind(Math.floor(Date.now() / 1000) - olderThanSec)
    .run();
}
