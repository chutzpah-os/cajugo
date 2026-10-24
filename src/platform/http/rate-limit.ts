import { and, desc, eq, gt, lt, sql } from "drizzle-orm";
import type { Db } from "../db/types";
import { rateLimits } from "../db/schema";

export type RateLimitRule = { limit: number; windowSeconds: number };

/** Limites iniciais (SECURITY.md §6). */
export const RATE_LIMITS = {
  publicForm: { limit: 5, windowSeconds: 60 },
  publicFormDaily: { limit: 30, windowSeconds: 24 * 60 * 60 },
  /** Falhas de login por rede no último minuto; login certo não conta (AUT-FR-003). */
  loginFailuresPerNetwork: { limit: 5, windowSeconds: 60 },
  /** Falhas por e-mail em quaisquer 15 min; a 5ª bloqueia por 15 min (AUT-FR-003). */
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

/**
 * Janela deslizante: registra um evento de `key` no instante exato (ex.: uma falha
 * de login). Eventos no mesmo instante somam no mesmo registro.
 */
export async function recordEvent(db: Db, key: string, now: Date = new Date()) {
  await db
    .insert(rateLimits)
    .values({ key, windowStart: now, count: 1 })
    .onConflictDoUpdate({
      target: [rateLimits.key, rateLimits.windowStart],
      set: { count: sql`${rateLimits.count} + 1` },
    });
}

/** Quantos eventos de `key` aconteceram nos últimos `windowSeconds`. */
export async function countRecentEvents(
  db: Db,
  key: string,
  windowSeconds: number,
  now: Date = new Date(),
): Promise<number> {
  const since = new Date(now.getTime() - windowSeconds * 1000);
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${rateLimits.count}), 0)::int` })
    .from(rateLimits)
    .where(and(eq(rateLimits.key, key), gt(rateLimits.windowStart, since)));
  return row.total;
}

/** Instante do evento mais recente de `key`, ou `null`. */
export async function lastEvent(db: Db, key: string): Promise<Date | null> {
  const [row] = await db
    .select({ at: rateLimits.windowStart })
    .from(rateLimits)
    .where(eq(rateLimits.key, key))
    .orderBy(desc(rateLimits.windowStart))
    .limit(1);
  return row?.at ?? null;
}

/** Apaga contadores antigos (cron diário). */
export async function purgeRateLimits(db: Db, olderThan: Date) {
  await db.delete(rateLimits).where(lt(rateLimits.windowStart, olderThan));
}
