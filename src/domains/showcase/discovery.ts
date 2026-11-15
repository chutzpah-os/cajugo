import {
  and,
  count,
  countDistinct,
  desc,
  eq,
  max,
  min,
  sql,
  type SQL,
} from "drizzle-orm";
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

type Entry = { path: string; name: string; count: number };

/**
 * Marcas pelo nome conhecido, em ordem alfabética. Dois nomes da FIPE podem dar a
 * mesma marca ("Caoa Chery/Chery" e "Caoa Chery"): as contagens somam.
 */
export function knownMakes(
  rows: { slug: string | null; name: string | null; count: number }[],
): { slug: string; name: string; count: number }[] {
  const bySlug = new Map<
    string,
    { slug: string; name: string; count: number }
  >();
  for (const r of rows) {
    if (!r.slug || !r.name) continue;
    const seen = bySlug.get(r.slug);
    if (seen) seen.count += r.count;
    else
      bySlug.set(r.slug, {
        slug: r.slug,
        name: brandName(r.name),
        count: r.count,
      });
  }
  return [...bySlug.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "pt-BR"),
  );
}

/** Índice `/carros` (DSC-FR-013): marcas e cidades com veículos na vitrine. */
export async function discoveryIndex(
  db: Db,
): Promise<{ makes: Entry[]; cities: Entry[] }> {
  const visible = publicVisible("showcase");
  const makeRows = await db
    .select({ slug: vehicles.makeSlug, name: vehicles.make, count: count() })
    .from(vehicles)
    .innerJoin(stores, eq(stores.id, vehicles.storeId))
    .where(visible)
    .groupBy(vehicles.makeSlug, vehicles.make);
  const cityRows = await db
    .select({
      slug: stores.citySlug,
      city: stores.city,
      state: stores.state,
      count: count(),
    })
    .from(vehicles)
    .innerJoin(stores, eq(stores.id, vehicles.storeId))
    .where(visible)
    .groupBy(stores.citySlug, stores.city, stores.state);

  const byName = (a: Entry, b: Entry) => a.name.localeCompare(b.name, "pt-BR");
  return {
    makes: knownMakes(makeRows).map((m) => ({
      path: discoveryPath({ makeSlug: m.slug }),
      name: m.name,
      count: m.count,
    })),
    cities: cityRows
      .flatMap((r) =>
        r.slug
          ? [
              {
                path: discoveryPath({ citySlug: r.slug }),
                name: `${r.city}/${r.state}`,
                count: r.count,
              },
            ]
          : [],
      )
      .sort(byName),
  };
}

const countWhere = (cond: SQL | undefined) =>
  cond
    ? sql<number>`count(*) filter (where ${cond})`.mapWith(Number)
    : sql<number>`0`.mapWith(Number);

/**
 * Links do veículo [1b] e do catálogo da loja para as páginas de descoberta
 * (DSC-FR-008, 009): só as que têm veículos na vitrine, numa consulta só.
 */
export async function discoveryLinks(
  db: Db,
  v: {
    make?: string | null;
    makeSlug?: string | null;
    model?: string | null;
    modelSlug?: string | null;
    city: string;
    state: string;
    citySlug: string | null;
  },
): Promise<{ name: string; path: string }[]> {
  const make = v.makeSlug ? eq(vehicles.makeSlug, v.makeSlug) : undefined;
  const model =
    make && v.modelSlug
      ? and(make, eq(vehicles.modelSlug, v.modelSlug))
      : undefined;
  const city = v.citySlug ? eq(stores.citySlug, v.citySlug) : undefined;
  const [n] = await db
    .select({
      make: countWhere(make),
      model: countWhere(model),
      city: countWhere(city),
    })
    .from(vehicles)
    .innerJoin(stores, eq(stores.id, vehicles.storeId))
    .where(publicVisible("showcase"));
  const brand = v.make ? brandName(v.make) : "";
  const links: { name: string; path: string }[] = [];
  if (n.make > 0 && v.makeSlug)
    links.push({
      name: `${brand} usados`,
      path: discoveryPath({ makeSlug: v.makeSlug }),
    });
  if (n.model > 0 && v.makeSlug && v.modelSlug)
    links.push({
      name: `${brand} ${v.model} usados`,
      path: discoveryPath({ makeSlug: v.makeSlug, modelSlug: v.modelSlug }),
    });
  if (n.city > 0 && v.citySlug)
    links.push({
      name: `Carros usados em ${v.city}/${v.state}`,
      path: discoveryPath({ citySlug: v.citySlug }),
    });
  return links;
}

/** A página existe (com ou sem veículos agora)? Para o 404 real do proxy (DSC-SEC-004). */
export async function discoveryExists(
  db: Db,
  key: DiscoveryKey,
): Promise<boolean> {
  return (await namesOf(db, key)) !== null;
}

type SitemapEntry = { path: string; lastModified: Date };

/**
 * Sitemap de descoberta (DSC-FR-010): o índice e cada página com veículos na vitrine;
 * a página sai quando o último veículo sai.
 */
export async function discoverySitemap(db: Db): Promise<SitemapEntry[]> {
  // Uma consulta: cada combinação marca × modelo × cidade com veículo visível.
  const rows = await db
    .select({
      makeSlug: vehicles.makeSlug,
      modelSlug: vehicles.modelSlug,
      citySlug: stores.citySlug,
      lastModified: max(vehicles.updatedAt),
    })
    .from(vehicles)
    .innerJoin(stores, eq(stores.id, vehicles.storeId))
    .where(publicVisible("showcase"))
    .groupBy(vehicles.makeSlug, vehicles.modelSlug, stores.citySlug);

  const pages = new Map<string, Date>();
  const touch = (key: DiscoveryKey, at: Date) => {
    const path = discoveryPath(key);
    const seen = pages.get(path);
    if (!seen || at > seen) pages.set(path, at);
  };
  for (const r of rows) {
    if (!r.lastModified) continue;
    touch({}, r.lastModified);
    if (r.makeSlug) {
      touch({ makeSlug: r.makeSlug }, r.lastModified);
      if (r.modelSlug)
        touch({ makeSlug: r.makeSlug, modelSlug: r.modelSlug }, r.lastModified);
    }
    if (r.citySlug) {
      touch({ citySlug: r.citySlug }, r.lastModified);
      if (r.makeSlug)
        touch({ citySlug: r.citySlug, makeSlug: r.makeSlug }, r.lastModified);
    }
  }
  // O índice `/carros` fica sempre, mesmo sem veículos.
  if (!pages.has("/carros")) pages.set("/carros", new Date(0));
  return [...pages].map(([path, lastModified]) => ({ path, lastModified }));
}
