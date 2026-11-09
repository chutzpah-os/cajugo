import { cacheLife, cacheTag } from "next/cache";
import { STORES_TAG } from "@/domains/stores/service";
import { VEHICLES_TAG } from "@/domains/vehicles/tags";
import { getDb } from "@/platform/db/client";
import type { Filters } from "./filters";
import {
  facets,
  searchShowcase,
  sitemapEntries,
  storePage,
  vehiclePage,
  type Scope,
} from "./service";

/**
 * Dados públicos com cache (cota gratuita): renovados por toda mudança visível de
 * veículo ou loja e válidos por no máximo 60 s (SHW-NFR-004, SHW-NFR-005).
 */
function tagged() {
  cacheTag(VEHICLES_TAG, STORES_TAG);
  cacheLife({ stale: 30, revalidate: 30, expire: 60 });
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

export async function cachedSitemap(kind: "stores" | "vehicles") {
  "use cache";
  tagged();
  return sitemapEntries(getDb(), kind);
}
