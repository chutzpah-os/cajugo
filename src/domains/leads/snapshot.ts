import { and, count, desc, eq, gte, lt } from "drizzle-orm";
import { saoPauloMonthStart } from "@/domains/billing/service";
import { leads, stores } from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";

/**
 * Leads no painel do admin [4a] (012b, ADM-FR-001/003): do dia 1 até agora e no mesmo
 * período do mês anterior, a origem (vitrine CajuGo × catálogos e links) e as lojas
 * com mais leads. Só contagens, sem dado do comprador. Sem sessão: só o domínio
 * `admin` chama, depois de conferir `admin.read`.
 */
export async function leadsSnapshot(db: Db, now: Date) {
  const start = saoPauloMonthStart(now);
  const prevStart = saoPauloMonthStart(new Date(start.getTime() - 86_400_000));
  const prevEnd = new Date(
    prevStart.getTime() + (now.getTime() - start.getTime()),
  );
  const thisMonth = and(gte(leads.createdAt, start), lt(leads.createdAt, now));
  const [byOrigin, [prev], top] = await Promise.all([
    db
      .select({ origin: leads.origin, n: count() })
      .from(leads)
      .where(thisMonth)
      .groupBy(leads.origin),
    db
      .select({ n: count() })
      .from(leads)
      .where(
        and(gte(leads.createdAt, prevStart), lt(leads.createdAt, prevEnd)),
      ),
    db
      .select({ storeId: stores.id, name: stores.name, leads: count() })
      .from(leads)
      .innerJoin(stores, eq(stores.id, leads.storeId))
      .where(thisMonth)
      .groupBy(stores.id, stores.name)
      .orderBy(desc(count()), stores.name)
      .limit(10),
  ]);
  const cajugo = byOrigin.find((r) => r.origin === "cajugo")?.n ?? 0;
  const total = byOrigin.reduce((acc, r) => acc + r.n, 0);
  return {
    count: total,
    previous: prev.n,
    origin: { cajugo, catalogs: total - cajugo },
    topStores: top,
  };
}
