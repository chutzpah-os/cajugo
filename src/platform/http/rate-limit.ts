import { and, eq, lt, sql } from "drizzle-orm";
import type { Db } from "../db/types";
import { rateLimits } from "../db/schema";

export type RateLimitRule = { limit: number; windowSeconds: number };

/** Limites iniciais (SECURITY.md §6). */
export const RATE_LIMITS = {
  publicForm: { limit: 5, windowSeconds: 60 },
  publicFormDaily: { limit: 30, windowSeconds: 24 * 60 * 60 },
  login: { limit: 5, windowSeconds: 60 },
  /** Falhas de login por e-mail: 5 em 15 min bloqueiam até o fim da janela (AUT-FR-003). */
  loginFailuresPerEmail: { limit: 5, windowSeconds: 15 * 60 },
} satisfies Record<string, RateLimitRule>;

function currentWindow(rule: RateLimitRule, now: Date) {
  const windowMs = rule.windowSeconds * 1000;
  const windowStart = new Date(Math.floor(now.getTime() / windowMs) * windowMs);
  const retryAfterSeconds = Math.ceil(
    (windowStart.getTime() + windowMs - now.getTime()) / 1000,
  );
  return { windowStart, retryAfterSeconds };
}

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
  const { windowStart, retryAfterSeconds } = currentWindow(rule, now);
  const [row] = await db
    .insert(rateLimits)
    .values({ key, windowStart, count: 1 })
    .onConflictDoUpdate({
      target: [rateLimits.key, rateLimits.windowStart],
      set: { count: sql`${rateLimits.count} + 1` },
    })
    .returning({ count: rateLimits.count });
  return { ok: row.count <= rule.limit, retryAfterSeconds };
}

/** Diz se `key` já atingiu o limite na janela atual, sem contar tentativa. */
export async function peekRateLimit(
  db: Db,
  key: string,
  rule: RateLimitRule,
  now: Date = new Date(),
): Promise<{ ok: boolean; retryAfterSeconds: number }> {
  const { windowStart, retryAfterSeconds } = currentWindow(rule, now);
  const [row] = await db
    .select({ count: rateLimits.count })
    .from(rateLimits)
    .where(
      and(eq(rateLimits.key, key), eq(rateLimits.windowStart, windowStart)),
    );
  return { ok: (row?.count ?? 0) < rule.limit, retryAfterSeconds };
}

/** Apaga contadores antigos (cron diário). */
export async function purgeRateLimits(db: Db, olderThan: Date) {
  await db.delete(rateLimits).where(lt(rateLimits.windowStart, olderThan));
}
