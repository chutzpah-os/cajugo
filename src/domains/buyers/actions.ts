"use server";

import { updateTag } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import {
  favoriteCards,
  similarPaths,
  type PublicCard,
} from "@/domains/showcase/service";
import { getDb } from "@/platform/db/client";
import { currentSession } from "@/domains/auth/service";
import { clientIp, hashIp } from "@/platform/http/client-ip";
import { AppError } from "@/platform/http/errors";
import { consumeRateLimit, RATE_LIMITS } from "@/platform/http/rate-limit";
import { errorMessage, logger } from "@/platform/http/logger";
import { FAVORITES_LIMIT } from "./favorites";
import {
  cancelAlert,
  markNotified,
  requestAlert,
  type AlertRequestResult,
  type CancelOutcome,
} from "./service";
import { ALERTS_TAG } from "./tags";

const input = z
  .object({ ids: z.array(z.uuid()).min(1).max(FAVORITES_LIMIT) })
  .strict();

/** Cards dos que estão na vitrine; para os outros, onde ver parecidos (BUY-FR-007). */
export type FavoritesRead = {
  cards: PublicCard[];
  similar: Record<string, string>;
};

/**
 * Cards atuais dos favoritos do aparelho [14a] (BUY-FR-005): só leitura pública, nada
 * é gravado nem registrado sobre quem favoritou (BUY-SEC-001). `null` em entrada
 * inválida ou falha, para a tela oferecer "Tentar de novo".
 */
export async function favoriteCardsAction(
  raw: unknown,
): Promise<FavoritesRead | null> {
  const parsed = input.safeParse(raw);
  if (!parsed.success) return null;
  try {
    const db = getDb();
    const ids = [...new Set(parsed.data.ids)];
    const cards = await favoriteCards(db, ids);
    const shown = new Set(cards.map((c) => c.vehicleId));
    const similar = await similarPaths(
      db,
      ids.filter((id) => !shown.has(id)),
    );
    return { cards, similar };
  } catch (error) {
    logger.error("buyers.favorites_failed", { error: errorMessage(error) });
    return null;
  }
}

/** "Avisar quando chegar" [12a] (ALR-FR-001): o servidor resolve a página e a busca. */
export async function createSearchAlertAction(
  raw: unknown,
): Promise<AlertRequestResult> {
  try {
    const result = await requestAlert(getDb(), raw, {
      ipHash: hashIp(clientIp(await headers())),
    });
    if (result.ok && result.cancelPath) updateTag(ALERTS_TAG);
    return result;
  } catch (error) {
    logger.error("buyers.alert_failed", { error: errorMessage(error) });
    return {
      ok: false,
      message: "Não foi possível guardar agora. Tente de novo em instantes.",
      errors: [],
    };
  }
}

/** "Marcar como avisado" em [Alertas] (ALR-FR-003): admin e suporte. */
export async function markAlertNotifiedAction(input: {
  alertId: string;
}): Promise<{ ok: boolean; message?: string }> {
  try {
    const done = await markNotified(getDb(), await currentSession(), input);
    updateTag(ALERTS_TAG);
    return done
      ? { ok: true }
      : { ok: false, message: "Este alerta já tinha sido fechado." };
  } catch (error) {
    if (error instanceof AppError) return { ok: false, message: error.title };
    logger.error("buyers.alert_notify_failed", { error: errorMessage(error) });
    return { ok: false, message: "Não foi possível concluir agora." };
  }
}

export type CancelActionOutcome = CancelOutcome | "rate-limited" | "failed";

/** Cancelar pelo link (ALR-FR-004): limite por rede contra tentativa de adivinhar. */
export async function cancelSearchAlertAction(
  input: unknown,
): Promise<CancelActionOutcome> {
  try {
    const db = getDb();
    const { ok } = await consumeRateLimit(
      db,
      `alert-cancel:ip:${hashIp(clientIp(await headers()))}`,
      RATE_LIMITS.liveCheck,
    );
    if (!ok) return "rate-limited";
    const result = await cancelAlert(db, input);
    if (result === "canceled") updateTag(ALERTS_TAG);
    return result;
  } catch (error) {
    logger.error("buyers.alert_cancel_failed", { error: errorMessage(error) });
    return "failed";
  }
}
