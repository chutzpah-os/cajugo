"use server";

import { z } from "zod";
import { errorMessage, logger } from "@/platform/http/logger";
import { cachedCount, cachedStorePage } from "./current";
import { filtersFromQuery } from "./filters";

const countInput = z
  .object({ store: z.string().max(60).nullable(), query: z.string().max(1000) })
  .strict();

/** "Ver N veículos" [6d]: só leitura, em cache; `null` quando não dá para contar. */
export async function countMatchesAction(
  input: unknown,
): Promise<number | null> {
  const parsed = countInput.safeParse(input);
  if (!parsed.success) return null;
  const { store, query } = parsed.data;
  try {
    const filters = filtersFromQuery(query);
    if (store === null) return await cachedCount("showcase", filters);
    const page = await cachedStorePage(store);
    return page?.kind === "store"
      ? await cachedCount({ storeId: page.storeId }, filters)
      : 0;
  } catch (error) {
    logger.error("showcase.count_failed", { error: errorMessage(error) });
    return null;
  }
}
