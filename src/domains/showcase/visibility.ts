import { and, eq, inArray, type SQL } from "drizzle-orm";
import { LIVE_STATUSES } from "@/domains/stores/service";
import { stores, vehicles } from "@/platform/db/schema";
import type { DiscoveryKey } from "./discovery-urls";

/**
 * Onde a lista vale: a vitrine, o catálogo de uma loja ou uma página de descoberta
 * (vitrine recortada por marca, modelo ou cidade, ADR 0014).
 */
export type Scope =
  "showcase" | { storeId: string } | { discovery: DiscoveryKey };

/** O que o público pode ver (SHW-SEC-002, SHW-SEC-003). Regra única de todas as listas. */
export function publicVisible(scope: Scope): SQL {
  return and(
    eq(vehicles.status, "published"),
    inArray(stores.status, [...LIVE_STATUSES]),
    scope !== "showcase" && "storeId" in scope
      ? eq(vehicles.storeId, scope.storeId)
      : eq(vehicles.shareOnCajugo, true),
    scope !== "showcase" && "discovery" in scope
      ? discoveryWhere(scope.discovery)
      : undefined,
  )!;
}

/** Recorte de descoberta: só acrescenta condições à regra da vitrine (DSC-SEC-001). */
function discoveryWhere(key: DiscoveryKey): SQL | undefined {
  return and(
    key.makeSlug ? eq(vehicles.makeSlug, key.makeSlug) : undefined,
    key.modelSlug ? eq(vehicles.modelSlug, key.modelSlug) : undefined,
    key.citySlug ? eq(stores.citySlug, key.citySlug) : undefined,
  );
}
