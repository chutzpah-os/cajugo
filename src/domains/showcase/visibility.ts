import { and, eq, inArray, type SQL } from "drizzle-orm";
import { LIVE_STATUSES } from "@/domains/stores/service";
import { stores, vehicles } from "@/platform/db/schema";
import type { DiscoveryKey } from "./discovery-urls";

/**
 * Onde a lista vale: a vitrine, o catálogo de uma loja, uma página de descoberta
 * (vitrine recortada por marca, modelo ou cidade, ADR 0014) ou os favoritos do aparelho
 * (veículos escolhidos, vistos como na página de cada um, BUY-SEC-002).
 */
export type Scope =
  | "showcase"
  | { storeId: string }
  | { discovery: DiscoveryKey }
  | { vehicleIds: string[] };

/** O que o público pode ver (SHW-SEC-002, SHW-SEC-003). Regra única de todas as listas. */
export function publicVisible(scope: Scope): SQL {
  return and(inArray(stores.status, [...LIVE_STATUSES]), scopeWhere(scope))!;
}

/**
 * Vitrine e descoberta: publicados e divulgados. Catálogo e veículos escolhidos
 * (página, favoritos, contato): publicados, divulgados ou não, e os ocultos pela CajuGo,
 * que saem só da vitrine (RPT-FR-005).
 */
function scopeWhere(scope: Scope): SQL | undefined {
  const onShowcase = and(
    eq(vehicles.status, "published"),
    eq(vehicles.shareOnCajugo, true),
  );
  const onCatalog = inArray(vehicles.status, ["published", "hidden"]);
  if (scope === "showcase") return onShowcase;
  if ("discovery" in scope)
    return and(onShowcase, discoveryWhere(scope.discovery));
  if ("storeId" in scope)
    return and(onCatalog, eq(vehicles.storeId, scope.storeId));
  return and(onCatalog, inArray(vehicles.id, scope.vehicleIds));
}

/** Recorte de descoberta: só acrescenta condições à regra da vitrine (DSC-SEC-001). */
function discoveryWhere(key: DiscoveryKey): SQL | undefined {
  return and(
    key.makeSlug ? eq(vehicles.makeSlug, key.makeSlug) : undefined,
    key.modelSlug ? eq(vehicles.modelSlug, key.modelSlug) : undefined,
    key.citySlug ? eq(stores.citySlug, key.citySlug) : undefined,
  );
}
