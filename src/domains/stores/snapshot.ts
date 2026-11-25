import { and, count, eq, gte, inArray } from "drizzle-orm";
import { saoPauloMonthStart } from "@/domains/billing/service";
import { stores } from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";
import { LIVE_STATUSES } from "./service";

/**
 * Lojas no painel do admin [4a] (012b, ADM-FR-001/002). Sem sessão: só o domínio
 * `admin` chama, depois de conferir `admin.read`. Só contagens, sem dado da loja.
 */
export async function storesSnapshot(db: Db, now: Date) {
  const start = saoPauloMonthStart(now);
  const [[live], [activated], [registered]] = await Promise.all([
    db
      .select({ n: count() })
      .from(stores)
      .where(inArray(stores.status, [...LIVE_STATUSES])),
    db
      .select({ n: count() })
      .from(stores)
      .where(
        and(
          inArray(stores.status, [...LIVE_STATUSES]),
          gte(stores.activatedAt, start),
        ),
      ),
    db
      .select({ n: count() })
      .from(stores)
      .where(eq(stores.status, "registered")),
  ]);
  return {
    active: live.n,
    activatedThisMonth: activated.n,
    registered: registered.n,
  };
}
