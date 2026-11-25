import { and, count, eq, gte, inArray } from "drizzle-orm";
import { saoPauloMonthStart } from "@/domains/billing/service";
import { profiles, stores } from "@/platform/db/schema";
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

/**
 * Dados da loja para o detalhe do admin [6g] (012b, ADM-FR-008): a loja, o dono e o
 * documento (só dígitos; quem chama decide se mascara). Null se não existe.
 */
export async function storeForAdmin(db: Db, storeId: string) {
  const [row] = await db
    .select({
      id: stores.id,
      name: stores.name,
      slug: stores.slug,
      city: stores.city,
      state: stores.state,
      status: stores.status,
      activatedAt: stores.activatedAt,
      createdAt: stores.createdAt,
      nextDueAt: stores.nextDueAt,
      taxId: stores.taxId,
      taxIdType: stores.taxIdType,
      acceptsSellers: stores.acceptsSellers,
      commissionType: stores.commissionType,
      commissionValue: stores.commissionValue,
      ownerId: profiles.id,
      ownerName: profiles.name,
      ownerEmail: profiles.email,
      ownerPhone: profiles.phone,
    })
    .from(stores)
    .innerJoin(profiles, eq(profiles.id, stores.ownerId))
    .where(eq(stores.id, storeId));
  return row ?? null;
}
