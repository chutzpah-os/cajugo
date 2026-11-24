import { eq } from "drizzle-orm";
import { stores } from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";
import { ownStore } from "@/domains/showcase/testing/e2e-seed";
import { runBillingCycle } from "../cycle";
import { saoPauloDate, saoPauloMidnight } from "../due-date";
import { removeBillingForTests } from "../service";

/** Lojas dos e2e do cancelamento (011b). Só no staging, nunca na produção. */
export const E2E_CANCEL = {
  active: { slug: "e2e-cancela", storeName: "Cancela E2E" },
  gone: { slug: "e2e-cancelada", storeName: "Cancelada E2E" },
  /** Próximo vencimento da loja ativa: o fim do período ao cancelar. */
  daysToDue: 20,
} as const;

const DAY_MS = 86_400_000;

const midnightIn = (now: Date, days: number) => {
  const [y, m, d] = saoPauloDate(new Date(now.getTime() + days * DAY_MS))
    .split("-")
    .map(Number);
  return { day: d, at: saoPauloMidnight(y, m, d) };
};

/**
 * "Cancela E2E": ativa, vence em 20 dias, sem cancelamento. "Cancelada E2E": o período
 * terminou ontem e o ciclo real a cancela.
 */
export async function seedCancellation(
  db: Db,
  owners: { active: string; gone: string },
  now: Date,
) {
  const C = E2E_CANCEL;
  const ids: string[] = [];
  for (const [key, ownerId] of Object.entries(owners) as [
    keyof typeof owners,
    string,
  ][]) {
    const storeId = await ownStore(db, ownerId, {
      name: C[key].storeName,
      slug: C[key].slug,
      status: "active",
    });
    await removeBillingForTests(db, { storeIds: [storeId], profileIds: [] });
    const due = midnightIn(now, key === "active" ? C.daysToDue : -1);
    await db
      .update(stores)
      .set({
        status: key === "active" ? "active" : "cancel_scheduled",
        billingDay: due.day,
        nextDueAt: due.at,
        pastDueSince: null,
        activatedAt: new Date(now.getTime() - 60 * DAY_MS),
        cancelRequestedAt:
          key === "active" ? null : new Date(now.getTime() - 10 * DAY_MS),
        cancelReason: null,
        activeUntil: key === "active" ? null : due.at,
        canceledAt: null,
        shareByDefault: false,
      })
      .where(eq(stores.id, storeId));
    ids.push(storeId);
  }
  await runBillingCycle(db, now, { storeIds: ids });
  return ids;
}
