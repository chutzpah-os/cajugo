import { cacheLife, cacheTag } from "next/cache";
import { getDb } from "@/platform/db/client";
import { getSettings } from "./service";

/** Tag do cache das regras: quem salva chama `updateTag(SETTINGS_TAG)`. */
export const SETTINGS_TAG = "settings";

/**
 * Regras vigentes para as telas, com cache de até 1 minuto (CFG-NFR-001). O cache
 * serve o valor guardado enquanto renova em segundo plano depois de `revalidate`, e
 * nunca depois de `expire`: com `expire` de 60 s, nenhuma tela mostra valor com mais
 * de 1 min. Quem salva vê na hora (`updateTag`).
 * Cálculos com data (faturas, comissões) usam `getSettings(db, data)` direto.
 */
export async function currentSettings() {
  "use cache";
  cacheTag(SETTINGS_TAG);
  cacheLife({ stale: 30, revalidate: 30, expire: 60 });
  return getSettings(getDb());
}
