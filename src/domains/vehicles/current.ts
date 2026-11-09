import { cacheLife, cacheTag } from "next/cache";
import { STORES_TAG } from "@/domains/stores/service";
import { getDb } from "@/platform/db/client";
import { publicVehicles } from "./service";
import { VEHICLES_TAG } from "./tags";

/**
 * Veículos do catálogo público, com cache (cota gratuita): renovado por toda mudança
 * visível de veículo e pela ativação ou suspensão da loja, e vale no máximo 60 s
 * (VEH-NFR-003, PRD §5.3).
 */
export async function cachedPublicVehicles(storeId: string) {
  "use cache";
  cacheTag(VEHICLES_TAG, STORES_TAG);
  cacheLife({ stale: 30, revalidate: 30, expire: 60 });
  return publicVehicles(getDb(), storeId);
}
