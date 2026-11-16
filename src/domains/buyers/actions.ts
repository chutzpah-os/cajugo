"use server";

import { z } from "zod";
import { favoriteCards, type PublicCard } from "@/domains/showcase/service";
import { getDb } from "@/platform/db/client";
import { errorMessage, logger } from "@/platform/http/logger";
import { FAVORITES_LIMIT } from "./favorites";

const input = z
  .object({ ids: z.array(z.uuid()).min(1).max(FAVORITES_LIMIT) })
  .strict();

/**
 * Cards atuais dos favoritos do aparelho [14a] (BUY-FR-005): só leitura pública, nada
 * é gravado nem registrado sobre quem favoritou (BUY-SEC-001). `null` em entrada
 * inválida ou falha, para a tela oferecer "Tentar de novo".
 */
export async function favoriteCardsAction(
  raw: unknown,
): Promise<{ cards: PublicCard[] } | null> {
  const parsed = input.safeParse(raw);
  if (!parsed.success) return null;
  try {
    const ids = [...new Set(parsed.data.ids)];
    return { cards: await favoriteCards(getDb(), ids) };
  } catch (error) {
    logger.error("buyers.favorites_failed", { error: errorMessage(error) });
    return null;
  }
}
