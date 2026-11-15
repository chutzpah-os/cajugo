import { and, count, countDistinct, desc, eq, max, min } from "drizzle-orm";
import { brandName } from "@/domains/fipe/service";
import { stores, vehicles } from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";
import type { DiscoveryNames, DiscoveryStats } from "@/platform/seo/discovery";
import { discoveryPath, type DiscoveryKey } from "./discovery-urls";
import { publicVisible } from "./visibility";

type Crumb = { name: string; path: string };

export type DiscoveryPage = {
  /** `empty`: a página já existiu e está sem veículos (DSC-FR-005). */
  kind: "listing" | "empty";
  key: DiscoveryKey;
  path: string;
  names: DiscoveryNames;
  crumbs: Crumb[];
  stats: DiscoveryStats;
  /** Página acima, mostrada quando esta está vazia; `key: null` é a vitrine. */
  fallback: { key: DiscoveryKey | null; path: string; name: string } | null;
};

/** Nome da marca (corrigido) e do modelo de algum veículo já registrado (D2). */
async function vehicleNames(db: Db, makeSlug: string, modelSlug?: string) {
  const [row] = await db
    .select({ make: vehicles.make, model: vehicles.model })
    .from(vehicles)
    .where(
      and(
        eq(vehicles.makeSlug, makeSlug),
        modelSlug ? eq(vehicles.modelSlug, modelSlug) : undefined,
      ),
    )
    .orderBy(desc(vehicles.updatedAt))
    .limit(1);
  return row?.make ? { make: brandName(row.make), model: row.model } : null;
}

/** Cidade de alguma loja cadastrada (D2). */
async function cityNames(db: Db, citySlug: string) {
  const [row] = await db
    .select({ city: stores.city, state: stores.state })
    .from(stores)
    .where(eq(stores.citySlug, citySlug))
    .limit(1);
  return row ?? null;
}

/** Nomes da página; `null` quando a marca, o modelo ou a cidade nunca existiu. */
async function namesOf(
  db: Db,
  key: DiscoveryKey,
): Promise<DiscoveryNames | null> {
  const names: DiscoveryNames = {};
  if (key.makeSlug) {
    const v = await vehicleNames(db, key.makeSlug, key.modelSlug);
    if (!v) return null;
    names.make = v.make;
    if (key.modelSlug) {
      if (!v.model) return null;
      names.model = v.model;
    }
  }
  if (key.citySlug) {
    const c = await cityNames(db, key.citySlug);
    if (!c) return null;
    names.city = c.city;
    names.state = c.state;
  }
  return names;
}

async function statsOf(db: Db, key: DiscoveryKey): Promise<DiscoveryStats> {
  const [r] = await db
    .select({
      total: count(),
      stores: countDistinct(vehicles.storeId),
      cities: countDistinct(stores.citySlug),
      minPriceCents: min(vehicles.priceCents),
      maxPriceCents: max(vehicles.priceCents),
    })
    .from(vehicles)
    .innerJoin(stores, eq(stores.id, vehicles.storeId))
    .where(publicVisible({ discovery: key }));
  return r;
}

const cityLabel = (n: DiscoveryNames) => `${n.city}/${n.state}`;

function crumbsOf(key: DiscoveryKey, n: DiscoveryNames): Crumb[] {
  const trail: Crumb[] = [
    { name: "Início", path: "/" },
    { name: "Carros", path: "/carros" },
  ];
  if (key.citySlug)
    trail.push({
      name: cityLabel(n),
      path: discoveryPath({ citySlug: key.citySlug }),
    });
  if (key.makeSlug)
    trail.push({
      name: n.make!,
      path: discoveryPath({ makeSlug: key.makeSlug, citySlug: key.citySlug }),
    });
  if (key.modelSlug) trail.push({ name: n.model!, path: discoveryPath(key) });
  return trail;
}

/** Do modelo para a marca, da marca na cidade para a cidade; o resto, a vitrine. */
function fallbackOf(key: DiscoveryKey, n: DiscoveryNames) {
  if (key.modelSlug && key.makeSlug) {
    const up = { makeSlug: key.makeSlug };
    return { key: up, path: discoveryPath(up), name: n.make! };
  }
  if (key.citySlug && key.makeSlug) {
    const up = { citySlug: key.citySlug };
    return { key: up, path: discoveryPath(up), name: cityLabel(n) };
  }
  return { key: null, path: "/", name: "a vitrine CajuGo" };
}

/**
 * Página de descoberta (DSC-FR-001 a 007): nomes, caminho e números do recorte. Sem
 * veículos visíveis, `empty` com a página acima; o que nunca existiu, `null` (404).
 */
export async function discoveryPage(
  db: Db,
  key: DiscoveryKey,
): Promise<DiscoveryPage | null> {
  const names = await namesOf(db, key);
  if (!names) return null;
  const stats = await statsOf(db, key);
  const listing = stats.total > 0;
  return {
    kind: listing ? "listing" : "empty",
    key,
    path: discoveryPath(key),
    names,
    crumbs: crumbsOf(key, names),
    stats,
    fallback: listing ? null : fallbackOf(key, names),
  };
}
