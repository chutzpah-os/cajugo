import { eq } from "drizzle-orm";
import { stores, vehicles } from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";

export { personWith, storeOwner } from "@/domains/billing/testing/fixtures";

/** Só testes: loja no ar (o 1º pagamento é da spec 004). */
export async function goLive(db: Db, storeId: string) {
  await db
    .update(stores)
    .set({ status: "active" })
    .where(eq(stores.id, storeId));
}

export async function vehicleRow(db: Db, vehicleId: string) {
  const [v] = await db
    .select()
    .from(vehicles)
    .where(eq(vehicles.id, vehicleId));
  return v;
}
