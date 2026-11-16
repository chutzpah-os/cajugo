import { cacheLife, cacheTag } from "next/cache";
import { SETTINGS_TAG } from "@/domains/settings/service";
import { STORES_TAG } from "@/domains/stores/service";
import { VEHICLES_TAG } from "@/domains/vehicles/service";
import { getDb } from "@/platform/db/client";
import { alertInbox } from "./service";
import { ALERTS_TAG } from "./tags";

/**
 * Alertas do admin com cache (ALR-NFR-003): uma consulta por alerta pendente, refeita
 * a cada 60 s ou quando muda veículo, loja, regra ou alerta. Serve a tela e o contador.
 */
export async function cachedAlertInbox() {
  "use cache";
  cacheTag(VEHICLES_TAG, STORES_TAG, SETTINGS_TAG, ALERTS_TAG);
  cacheLife({ stale: 60, revalidate: 60, expire: 3600 });
  return alertInbox(getDb());
}
