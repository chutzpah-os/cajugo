import { cacheLife, cacheTag } from "next/cache";
import { SETTINGS_TAG } from "@/domains/settings/service";
import { STORES_TAG } from "@/domains/stores/service";
import { VEHICLES_TAG } from "@/domains/vehicles/service";
import { getDb } from "@/platform/db/client";
import type { SitemapId } from "@/platform/seo/indexing";
import type { DiscoveryKey } from "./discovery-urls";
import type { Filters } from "./filters";
import {
  countMatches,
  discoveryLinks,
  discoveryPage,
  facets,
  searchShowcase,
  sitemapEntries,
  storePage,
  vehiclePage,
  type Scope,
} from "./service";

/**
 * Dados públicos com cache (cota gratuita): renovados por toda mudança visível de
 * veículo ou loja e por tempo, a cada 30 s (SHW-NFR-004, SHW-NFR-005).
 */
function tagged() {
  // Regras entram pela parcela estimada (SHW-FR-003): mudar em [4c] renova a vitrine.
  cacheTag(VEHICLES_TAG, STORES_TAG, SETTINGS_TAG);
  // Renova a cada 30 s; validade longa para a página poder ser pré-renderizada.
  cacheLife({ stale: 30, revalidate: 30, expire: 3600 });
}

export async function cachedSearch(
  scope: Scope,
  filters: Filters,
  cursor?: string | null,
) {
  "use cache";
  tagged();
  return searchShowcase(getDb(), { scope, filters, cursor });
}

export async function cachedCount(scope: Scope, filters: Filters) {
  "use cache";
  tagged();
  return countMatches(getDb(), scope, filters);
}

export async function cachedFacets(scope: Scope) {
  "use cache";
  tagged();
  return facets(getDb(), scope);
}

export async function cachedStorePage(slug: string) {
  "use cache";
  tagged();
  return storePage(getDb(), slug);
}

export async function cachedVehiclePage(id: string) {
  "use cache";
  tagged();
  return vehiclePage(getDb(), id);
}

export async function cachedSitemap(kind: Exclude<SitemapId, "pages">) {
  "use cache";
  tagged();
  return sitemapEntries(getDb(), kind);
}

export async function cachedDiscoveryPage(key: DiscoveryKey) {
  "use cache";
  tagged();
  return discoveryPage(getDb(), key);
}

export async function cachedDiscoveryLinks(
  v: Parameters<typeof discoveryLinks>[1],
) {
  "use cache";
  tagged();
  return discoveryLinks(getDb(), v);
}
