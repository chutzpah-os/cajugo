import { and, count, eq, gte, inArray } from "drizzle-orm";
import { saoPauloMonthStart } from "@/domains/billing/service";
import { stores, vehicles } from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";
import { publicVisible } from "./visibility";

/**
 * Veículos no painel do admin [4a] (012b, ADM-FR-001/002): na vitrine (a mesma regra
 * das listas públicas), publicados no mês e aguardando aprovação. Sem sessão: só o
 * domínio `admin` chama, depois de conferir `admin.read`.
 */
export async function vehiclesSnapshot(db: Db, now: Date) {
  const start = saoPauloMonthStart(now);
  const [[onShowcase], [published], [pending]] = await Promise.all([
    db
      .select({ n: count() })
      .from(vehicles)
      .innerJoin(stores, eq(stores.id, vehicles.storeId))
      .where(publicVisible("showcase")),
    db
      .select({ n: count() })
      .from(vehicles)
      .where(
        and(
          inArray(vehicles.status, ["published", "hidden", "sold"]),
          gte(vehicles.publishedAt, start),
        ),
      ),
    db
      .select({ n: count() })
      .from(vehicles)
      .where(eq(vehicles.status, "pending_approval")),
  ]);
  return {
    onShowcase: onShowcase.n,
    publishedThisMonth: published.n,
    pendingApproval: pending.n,
  };
}
