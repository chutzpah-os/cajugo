import { vehicleReports } from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";

/**
 * Denúncia aberta do seed (spec 007b), refeita a cada seed: a limpeza dos veículos da
 * vitrine apaga as denúncias em cascata, e o veículo volta sem a marca de moderação.
 */
export const E2E_REPORTS = {
  details: "Seed E2E: preço muito abaixo da FIPE",
  id: "00000000-0000-7000-8000-00000000e7a1",
} as const;

export async function seedReports(db: Db, vehicleId: string, now: Date) {
  await db.insert(vehicleReports).values({
    id: E2E_REPORTS.id,
    vehicleId,
    reason: "unreal_price",
    details: E2E_REPORTS.details,
    createdAt: new Date(now.getTime() - 3_600_000),
  });
}
