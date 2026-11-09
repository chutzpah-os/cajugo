"use server";

import { z } from "zod";
import { errorMessage, logger } from "@/platform/http/logger";
import { cachedCount, cachedSearch, cachedStorePage } from "./current";
import { filtersFromQuery } from "./filters";
import type { PublicCard, Scope } from "./service";

type Page = { items: PublicCard[]; nextCursor: string | null };

const countInput = z
  .object({ store: z.string().max(60).nullable(), query: z.string().max(1000) })
  .strict();

/** Vitrine ou catálogo de loja no ar; o resto não tem o que listar. */
async function scopeOf(store: string | null): Promise<Scope | null> {
  if (store === null) return "showcase";
  const page = await cachedStorePage(store);
  return page?.kind === "store" ? { storeId: page.storeId } : null;
}

/** "Ver N veículos" [6d]: só leitura, em cache; `null` quando não dá para contar. */
export async function countMatchesAction(
  input: unknown,
): Promise<number | null> {
  const parsed = countInput.safeParse(input);
  if (!parsed.success) return null;
  const { store, query } = parsed.data;
  try {
    const filters = filtersFromQuery(query);
    const scope = await scopeOf(store);
    return scope ? await cachedCount(scope, filters) : 0;
  } catch (error) {
    logger.error("showcase.count_failed", { error: errorMessage(error) });
    return null;
  }
}

const loadMoreInput = countInput
  .extend({ cursor: z.string().max(300) })
  .strict();

/** Próxima página da lista pública (SHW-FR-007); `null` em falha, para "Tentar de novo". */
export async function loadMoreAction(input: unknown): Promise<Page | null> {
  const parsed = loadMoreInput.safeParse(input);
  if (!parsed.success) return null;
  const { store, query, cursor } = parsed.data;
  try {
    const scope = await scopeOf(store);
    if (!scope) return { items: [], nextCursor: null };
    const { items, nextCursor } = await cachedSearch(
      scope,
      filtersFromQuery(query),
      cursor,
    );
    return { items, nextCursor };
  } catch (error) {
    logger.error("showcase.load_more_failed", { error: errorMessage(error) });
    return null;
  }
}
