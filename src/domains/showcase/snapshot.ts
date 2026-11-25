import { and, count, desc, eq, gte, inArray, notInArray } from "drizzle-orm";
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

/**
 * Estoque da loja no detalhe do admin [6g] (012b, ADM-FR-008): veículos no catálogo
 * (sem vendidos e excluídos), os na vitrine CajuGo e os 3 mais recentes.
 */
export async function storeStock(db: Db, storeId: string) {
  const inStock = and(
    eq(vehicles.storeId, storeId),
    notInArray(vehicles.status, ["deleted", "sold"]),
  );
  const [[total], [onCajugo], first] = await Promise.all([
    db.select({ n: count() }).from(vehicles).where(inStock),
    db
      .select({ n: count() })
      .from(vehicles)
      .innerJoin(stores, eq(stores.id, vehicles.storeId))
      .where(and(eq(vehicles.storeId, storeId), publicVisible("showcase"))),
    db
      .select({
        id: vehicles.id,
        make: vehicles.make,
        model: vehicles.model,
        version: vehicles.version,
        yearModel: vehicles.yearModel,
        priceCents: vehicles.priceCents,
        status: vehicles.status,
      })
      .from(vehicles)
      .where(inStock)
      .orderBy(desc(vehicles.id))
      .limit(3),
  ]);
  return { total: total.n, onCajugo: onCajugo.n, first };
}
