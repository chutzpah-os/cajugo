import { lt, sql } from "drizzle-orm";
import type { Db } from "../db/types";
import { rateLimits } from "../db/schema";

export type RateLimitRule = { limit: number; windowSeconds: number };

/** Limites iniciais (SECURITY.md §6). */
export const RATE_LIMITS = {
  publicForm: { limit: 5, windowSeconds: 60 },
  publicFormDaily: { limit: 30, windowSeconds: 24 * 60 * 60 },
  login: { limit: 5, windowSeconds: 60 },
} satisfies Record<string, RateLimitRule>;

/**
 * Conta uma tentativa para `key` na janela atual e diz se ainda está dentro do limite.
 * Janela fixa: o contador zera no início de cada janela. Atômico (upsert), seguro com concorrência.
 */
export async function consumeRateLimit(
  db: Db,
  key: string,
  rule: RateLimitRule,
  now: Date = new Date(),
): Promise<{ ok: boolean; retryAfterSeconds: number }> {
  const windowMs = rule.windowSeconds * 1000;
  const windowStart = new Date(Math.floor(now.getTime() / windowMs) * windowMs);
  const [row] = await db
    .insert(rateLimits)
    .values({ key, windowStart, count: 1 })
    .onConflictDoUpdate({
      target: [rateLimits.key, rateLimits.windowStart],
      set: { count: sql`${rateLimits.count} + 1` },
    })
    .returning({ count: rateLimits.count });
  const retryAfterSeconds = Math.ceil(
    (windowStart.getTime() + windowMs - now.getTime()) / 1000,
  );
  return { ok: row.count <= rule.limit, retryAfterSeconds };
}

/** Apaga contadores antigos (cron diário). */
export async function purgeRateLimits(db: Db, olderThan: Date) {
  await db.delete(rateLimits).where(lt(rateLimits.windowStart, olderThan));
}
