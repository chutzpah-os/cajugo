import { vehicleReports } from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";
import { uuidv7 } from "@/platform/db/uuid";

/** Só testes: uma denúncia gravada direto, sem passar pelo formulário. */
export async function report(
  db: Db,
  vehicleId: string,
  over: Partial<typeof vehicleReports.$inferInsert> = {},
) {
  const [row] = await db
    .insert(vehicleReports)
    .values({
      id: uuidv7(),
      vehicleId,
      reason: "unreal_price",
      details: null,
      ...over,
    })
    .returning();
  return row;
}
