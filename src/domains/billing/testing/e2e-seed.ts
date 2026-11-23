import { eq } from "drizzle-orm";
import {
  invoices,
  sales,
  stores,
  vehiclePhotos,
  vehicles,
} from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";
import { ownStore, row } from "@/domains/showcase/testing/e2e-seed";
import { removeVehiclesForTests } from "@/domains/vehicles/service";
import { runBillingCycle } from "../cycle";
import { saoPauloDate, saoPauloMidnight } from "../due-date";
import { removeBillingForTests } from "../service";

/** Loja dos e2e do ciclo de cobrança (spec 011). Só no staging, nunca na produção. */
export const E2E_BILLING = {
  slug: "e2e-fatura",
  storeName: "Fatura E2E",
  vehicleId: "00000000-0000-4000-8000-00000000e301",
  soldId: "00000000-0000-4000-8000-00000000e302",
  /** A fatura venceu há 10 dias: o ciclo abre, marca o atraso e suspende. */
  daysLate: 10,
} as const;

const DAY_MS = 86_400_000;

/**
 * Loja com a 1ª mensalidade paga, um veículo no catálogo e uma venda via vendedor
 * (taxa de R$ 500) com o vencimento 10 dias atrás; o ciclo real roda só nela e a
 * deixa suspensa, com a fatura de R$ 600 aberta.
 */
export async function seedBilling(
  db: Db,
  ownerId: string,
  now: Date,
): Promise<string> {
  const B = E2E_BILLING;
  const storeId = await ownStore(db, ownerId, {
    name: B.storeName,
    slug: B.slug,
    status: "active",
  });
  await removeBillingForTests(db, { storeIds: [storeId], profileIds: [] });
  await removeVehiclesForTests(db, [storeId]);

  const [y, m, d] = saoPauloDate(new Date(now.getTime() - B.daysLate * DAY_MS))
    .split("-")
    .map(Number);
  await db
    .update(stores)
    .set({
      status: "active",
      billingDay: d,
      nextDueAt: saoPauloMidnight(y, m, d),
      pastDueSince: null,
      activatedAt: new Date(now.getTime() - 40 * DAY_MS),
      acceptsSellers: false,
    })
    .where(eq(stores.id, storeId));
  await db.insert(invoices).values({
    storeId,
    kind: "first",
    membershipCents: 10_000,
    totalCents: 10_000,
    dueAt: new Date(now.getTime() - 40 * DAY_MS),
    status: "paid",
    paidAt: new Date(now.getTime() - 40 * DAY_MS),
  });

  await db.insert(vehicles).values([
    { ...row(storeId, 0, now), id: B.vehicleId, shareOnCajugo: false },
    {
      ...row(storeId, 1, now),
      id: B.soldId,
      status: "sold",
      shareOnCajugo: false,
      soldAt: new Date(now.getTime() - 15 * DAY_MS),
    },
  ]);
  await db.insert(vehiclePhotos).values(
    [B.vehicleId, B.soldId].map((vehicleId) => ({
      vehicleId,
      publicId: "sample",
      position: 0,
    })),
  );
  const [sale] = await db
    .insert(sales)
    .values({
      vehicleId: B.soldId,
      storeId,
      finalPriceCents: 5_000_000,
      attribution: "other_partner",
      feeBps: 100,
      feeCents: 50_000,
      confirmedBy: ownerId,
      createdAt: new Date(now.getTime() - 15 * DAY_MS),
    })
    .returning({ id: sales.id });
  await db
    .update(vehicles)
    .set({ saleId: sale.id })
    .where(eq(vehicles.id, B.soldId));

  await runBillingCycle(db, now, { storeIds: [storeId] });
  return storeId;
}
