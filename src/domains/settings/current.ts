import { cacheLife, cacheTag } from "next/cache";
import { getDb } from "@/platform/db/client";
import { getSettings } from "./service";

/** Tag do cache das regras: quem salva chama `updateTag(SETTINGS_TAG)`. */
export const SETTINGS_TAG = "settings";

/**
 * Regras vigentes para as telas, com cache de até 1 minuto (CFG-NFR-001): nenhuma
 * instância serve valor com mais de 1 min, e quem salva vê na hora (`updateTag`).
 * Cálculos com data (faturas, comissões) usam `getSettings(db, data)` direto.
 */
export async function currentSettings() {
  "use cache";
  cacheTag(SETTINGS_TAG);
  cacheLife({ stale: 60, revalidate: 60, expire: 300 });
  return getSettings(getDb());
}
