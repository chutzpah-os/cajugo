import {
  and,
  count,
  countDistinct,
  desc,
  eq,
  asc,
  gt,
  gte,
  inArray,
  lt,
  lte,
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { TYPE_OF_EVERY_VEHICLE } from "./vehicle-types";
import { getSettings } from "@/domains/settings/service";
import type { SimulatorSetup } from "./simulator";
import {
  isStoreLive,
  LIVE_STATUSES,
  resolveSlug,
} from "@/domains/stores/service";
import {
  BODIES,
  CONDITIONS,
  FEATURES,
  FUELS,
  TRANSMISSIONS,
} from "@/domains/vehicles/service";
import { brl } from "@/platform/br/money";
import { appUrl } from "@/platform/http/urls";
import { whatsappLink } from "@/platform/whatsapp/link";
import { estimatedInstallment } from "@/platform/br/installment";
import { plainText } from "@/platform/br/slug";
import { STATE_NAME } from "@/platform/geo/states";
import { stores, vehiclePhotos, vehicles } from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";
import type { GateDecision } from "@/platform/http/public-gate";
import { filtersFromQuery, type Filters, type Sort } from "./filters";
import { discoveryKeyOf } from "./list-source";
import type { SavedSearch } from "./saved-search";
import { discoveryExists, discoverySitemap, knownMakes } from "./discovery";
import { discoveryPath, parseDiscoveryPath } from "./discovery-urls";
import { publicVisible, type Scope } from "./visibility";
import { idFromVehicleParam, vehiclePath } from "./urls";

/**
 * Leitura pública dos veículos (spec 006): vitrine, catálogo da loja e página do
 * veículo. Sem sessão. Saída montada à mão: a consulta nem seleciona placa, chassi ou
 * dados de cobrança (SHW-SEC-001).
 */
export type PublicCard = {
  vehicleId: string;
  path: string;
  make: string | null;
  model: string | null;
  version: string | null;
  yearManufacture: number | null;
  yearModel: number | null;
  mileageKm: number | null;
  city: string;
  state: string;
  storeName: string;
  priceCents: number | null;
  installmentCents: number | null;
  badge: string | null;
  coverPublicId: string | null;
  photoCount: number;
};

const PAGE = 20;

/** Texto digitado → consulta por prefixo de cada palavra; sem símbolos de busca. */
function searchQuery(q: string): string | null {
  const words = plainText(q)
    .split(/[^a-z0-9.]+/)
    .filter(Boolean)
    .slice(0, 8);
  return words.length ? words.map((w) => `${w}:*`).join(" & ") : null;
}

/** Filtros da URL como condições da consulta (SHW-FR-004, 005). */
function filterConditions(f: Filters): (SQL | undefined)[] {
  const query = f.q ? searchQuery(f.q) : null;
  return [
    // Até a 014 gravar o tipo, todo veículo é carro: os outros tipos vêm vazios.
    f.type && f.type !== TYPE_OF_EVERY_VEHICLE ? sql`false` : undefined,
    query
      ? sql`${vehicles.search} @@ to_tsquery('simple', ${query})`
      : undefined,
    f.makes.length || f.models?.length
      ? or(
          f.makes.length ? inArray(vehicles.makeSlug, f.makes) : undefined,
          ...(f.models ?? []).map((m) => {
            const [make, model] = m.split("--");
            return and(
              eq(vehicles.makeSlug, make),
              eq(vehicles.modelSlug, model),
            );
          }),
        )
      : undefined,
    f.cities?.length ? inArray(stores.citySlug, f.cities) : undefined,
    f.priceFrom !== undefined
      ? gte(vehicles.priceCents, f.priceFrom)
      : undefined,
    f.priceTo !== undefined ? lte(vehicles.priceCents, f.priceTo) : undefined,
    f.yearFrom !== undefined ? gte(vehicles.yearModel, f.yearFrom) : undefined,
    f.yearTo !== undefined ? lte(vehicles.yearModel, f.yearTo) : undefined,
    f.kmTo !== undefined ? lte(vehicles.mileageKm, f.kmTo) : undefined,
    f.transmissions.length
      ? inArray(vehicles.transmission, f.transmissions)
      : undefined,
    f.fuels.length ? inArray(vehicles.fuel, f.fuels) : undefined,
  ];
}

const whereOf = (scope: Scope, f: Filters) =>
  and(publicVisible(scope), ...filterConditions(f));

/** Selos que se aplicam, na ordem de prioridade; o card mostra o primeiro. */
export function pickBadges(v: {
  priceCents: number | null;
  fipePriceCents: number | null;
  conditions: unknown;
}): string[] {
  const c = (v.conditions ?? {}) as Record<string, boolean>;
  return [
    v.priceCents !== null &&
      v.fipePriceCents !== null &&
      v.priceCents < v.fipePriceCents &&
      "Abaixo da FIPE",
    c.singleOwner && "Único dono",
    c.acceptsTrade && "Aceita troca",
    c.factoryWarranty && "Garantia de fábrica",
  ].filter((b): b is string => !!b);
}

const cardColumns = {
  vehicleId: vehicles.id,
  rankScore: vehicles.rankScore,
  publishedAt: vehicles.publishedAt,
  make: vehicles.make,
  model: vehicles.model,
  version: vehicles.version,
  yearManufacture: vehicles.yearManufacture,
  yearModel: vehicles.yearModel,
  mileageKm: vehicles.mileageKm,
  priceCents: vehicles.priceCents,
  fipePriceCents: vehicles.fipePriceCents,
  showInstallment: vehicles.showInstallment,
  conditions: vehicles.conditions,
  city: stores.city,
  state: stores.state,
  storeName: stores.name,
  coverPublicId: vehiclePhotos.publicId,
  photoCount:
    sql<number>`(select count(*) from vehicle_photos p where p.vehicle_id = ${vehicles.id})`.mapWith(
      Number,
    ),
};

type CardRow = {
  vehicleId: string;
  rankScore: number;
  publishedAt: Date | null;
  make: string | null;
  model: string | null;
  version: string | null;
  yearManufacture: number | null;
  yearModel: number | null;
  mileageKm: number | null;
  priceCents: number | null;
  fipePriceCents: number | null;
  showInstallment: boolean;
  conditions: unknown;
  city: string;
  state: string;
  storeName: string;
  coverPublicId: string | null;
  photoCount: number;
};

async function toCards(db: Db, rows: CardRow[]): Promise<PublicCard[]> {
  const s = await getSettings(db);
  return rows.map((r) => ({
    vehicleId: r.vehicleId,
    path: vehiclePath({
      id: r.vehicleId,
      make: r.make,
      model: r.model,
      yearModel: r.yearModel,
      city: r.city,
      state: r.state,
    }),
    make: r.make,
    model: r.model,
    version: r.version,
    yearManufacture: r.yearManufacture,
    yearModel: r.yearModel,
    mileageKm: r.mileageKm,
    city: r.city,
    state: r.state,
    storeName: r.storeName,
    priceCents: r.priceCents,
    installmentCents:
      r.showInstallment && r.priceCents !== null
        ? estimatedInstallment({
            priceCents: r.priceCents,
            downBps: s.installment_down_bps,
            months: s.installment_months,
            rateBps: s.installment_rate_bps,
          })
        : null,
    badge: pickBadges(r)[0] ?? null,
    coverPublicId: r.coverPublicId,
    photoCount: r.photoCount,
  }));
}

function baseQuery(db: Db) {
  return db
    .select(cardColumns)
    .from(vehicles)
    .innerJoin(stores, eq(stores.id, vehicles.storeId))
    .leftJoin(
      vehiclePhotos,
      and(
        eq(vehiclePhotos.vehicleId, vehicles.id),
        eq(vehiclePhotos.position, 0),
      ),
    );
}

export type SearchResult = {
  items: PublicCard[];
  total: number;
  stores: number;
  nextCursor: string | null;
};

type SortColumn =
  | typeof vehicles.rankScore
  | typeof vehicles.priceCents
  | typeof vehicles.publishedAt
  | typeof vehicles.mileageKm
  | typeof vehicles.yearModel;

const SORT_SPEC: Record<Sort, { column: SortColumn; dir: "asc" | "desc" }> = {
  relevance: { column: vehicles.rankScore, dir: "desc" },
  price_asc: { column: vehicles.priceCents, dir: "asc" },
  price_desc: { column: vehicles.priceCents, dir: "desc" },
  newest: { column: vehicles.publishedAt, dir: "desc" },
  km_asc: { column: vehicles.mileageKm, dir: "asc" },
  year_desc: { column: vehicles.yearModel, dir: "desc" },
};

type CursorValue = string | number | null;

const encodeCursor = (value: CursorValue, id: string) =>
  Buffer.from(JSON.stringify([value, id])).toString("base64url");

/** Cursor adulterado ou de outra ordem vira `null` (volta ao início, SHW-SEC-004). */
function decodeCursor(cursor: string): [string | number, string] | null {
  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(cursor, "base64url").toString(),
    );
    if (
      Array.isArray(parsed) &&
      parsed.length === 2 &&
      (typeof parsed[0] === "string" || typeof parsed[0] === "number") &&
      typeof parsed[1] === "string" &&
      /^[0-9a-f-]{36}$/.test(parsed[1])
    )
      return [parsed[0], parsed[1]];
  } catch {
    // cai no null abaixo
  }
  return null;
}

function cursorValue(sort: Sort, r: CardRow): CursorValue {
  switch (sort) {
    case "relevance":
      return r.rankScore;
    case "price_asc":
    case "price_desc":
      return r.priceCents;
    case "newest":
      return r.publishedAt?.toISOString() ?? null;
    case "km_asc":
      return r.mileageKm;
    case "year_desc":
      return r.yearModel;
  }
}

/** Depois do último item da página: por valor e, no empate, por id (SHW-FR-007). */
function afterCursor(sort: Sort, cursor?: string | null): SQL | undefined {
  const decoded = cursor ? decodeCursor(cursor) : null;
  if (!decoded) return undefined;
  const [rawValue, id] = decoded;
  const { column, dir } = SORT_SPEC[sort];
  const isDate = column === vehicles.publishedAt;
  if (isDate !== (typeof rawValue === "string")) return undefined;
  const value = (isDate ? new Date(rawValue) : rawValue) as never;
  const beyond = dir === "asc" ? gt : lt;
  return or(
    beyond(column, value),
    and(eq(column, value), beyond(vehicles.id, id)),
  );
}

/** Lista da vitrine ou do catálogo da loja (SHW-FR-001, 002). */
export async function searchShowcase(
  db: Db,
  input: { scope: Scope; filters: Filters; cursor?: string | null },
): Promise<SearchResult> {
  const where = whereOf(input.scope, input.filters);
  const [totals] = await db
    .select({ total: count(), stores: countDistinct(vehicles.storeId) })
    .from(vehicles)
    .innerJoin(stores, eq(stores.id, vehicles.storeId))
    .where(where);
  const { sort } = input.filters;
  const { column, dir } = SORT_SPEC[sort];
  const order = dir === "asc" ? asc : desc;
  const rows = await baseQuery(db)
    .where(and(where, afterCursor(sort, input.cursor)))
    .orderBy(order(column), order(vehicles.id))
    .limit(PAGE + 1);
  const page = rows.slice(0, PAGE);
  const last = page.at(-1);
  return {
    items: await toCards(db, page),
    total: totals.total,
    stores: totals.stores,
    nextCursor:
      rows.length > PAGE && last
        ? encodeCursor(cursorValue(sort, last), last.vehicleId)
        : null,
  };
}

/**
 * Cards atuais dos favoritos do aparelho (BUY-FR-007): só os veículos que a página
 * pública mostra agora; o que falta na resposta está indisponível.
 */
export async function favoriteCards(
  db: Db,
  ids: string[],
): Promise<PublicCard[]> {
  if (!ids.length) return [];
  const rows = await baseQuery(db).where(publicVisible({ vehicleIds: ids }));
  return toCards(db, rows);
}

/**
 * A quem vai um contato pela página do veículo (LED-FR-001, LED-FR-004): a loja do
 * veículo que o público vê agora (a mesma regra da página) e se ele é divulgado na
 * CajuGo. Fora do ar, loja suspensa ou id desconhecido: `null`.
 */
export async function contactTarget(
  db: Db,
  vehicleId: string,
): Promise<{ storeId: string; shared: boolean } | null> {
  const [row] = await db
    .select({
      storeId: vehicles.storeId,
      shared: vehicles.shareOnCajugo,
      status: vehicles.status,
    })
    .from(vehicles)
    .innerJoin(stores, eq(stores.id, vehicles.storeId))
    .where(publicVisible({ vehicleIds: [vehicleId] }));
  // Oculto pela CajuGo só é visto pelo catálogo: o contato é "Seu catálogo".
  return row
    ? { storeId: row.storeId, shared: row.shared && row.status === "published" }
    : null;
}

/**
 * Para onde leva "Ver veículos parecidos" de um favorito que saiu da vitrine
 * (BUY-FR-007): a página de descoberta do modelo (ou da marca), que existe enquanto
 * houver registro dele (D2 da 006b); sem registro, a vitrine. Só endereço, nenhum dado.
 */
export async function similarPaths(
  db: Db,
  ids: string[],
): Promise<Record<string, string>> {
  const out: Record<string, string> = Object.fromEntries(
    ids.map((id) => [id, "/"]),
  );
  if (!ids.length) return out;
  const rows = await db
    .select({
      id: vehicles.id,
      makeSlug: vehicles.makeSlug,
      modelSlug: vehicles.modelSlug,
    })
    .from(vehicles)
    .where(inArray(vehicles.id, ids));
  for (const r of rows)
    if (r.makeSlug)
      out[r.id] = discoveryPath({
        makeSlug: r.makeSlug,
        modelSlug: r.modelSlug ?? undefined,
      });
  return out;
}

/**
 * Primeiro veículo que atende a uma busca guardada e entrou na vitrine depois de
 * `after` (ALR-FR-002): a mesma regra e os mesmos filtros da lista, então o alerta e a
 * vitrine nunca divergem; não divulgado e loja fora do ar nunca casam (ALR-SEC-003).
 */
export async function firstMatch(
  db: Db,
  search: SavedSearch,
  after: Date,
): Promise<PublicCard | null> {
  const key = search.discoveryPath
    ? discoveryKeyOf(search.discoveryPath)
    : null;
  if (search.discoveryPath && !key) return null;
  const scope: Scope = key ? { discovery: key } : "showcase";
  const rows = await baseQuery(db)
    .where(
      and(
        whereOf(scope, filtersFromQuery(search.query)),
        gt(vehicles.publishedAt, after),
      ),
    )
    .orderBy(asc(vehicles.publishedAt), asc(vehicles.id))
    .limit(1);
  const [card] = await toCards(db, rows);
  return card ?? null;
}

type StoreHours = Extract<StorePage, { kind: "store" }>["hours"];

/** Leitura dos filtros da URL, para quem usa o domínio de fora (testes de `vehicles`). */
export { filtersFromQuery, parseFilters } from "./filters";

export type StorePage =
  | {
      kind: "store";
      storeId: string;
      name: string;
      slug: string;
      city: string;
      state: string;
      about: string | null;
      hours: Record<string, { ranges?: { from: string; to: string }[] }> | null;
      /** Cidade no endereço de descoberta (DSC-FR-009). */
      citySlug: string | null;
      whatsapp: string;
      logoPublicId: string | null;
      coverPublicId: string | null;
      initials: string;
    }
  | { kind: "suspended" }
  /** Cancelada (011b, CAN-SEC-005): "Esta loja não está mais na CajuGo", sem motivo. */
  | { kind: "gone" }
  | { kind: "redirect"; to: string };

const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

/**
 * Loja do endereço `/loja/{slug}` (SHW-FR-002, 011, 014). Suspensa: aviso sem motivo.
 * Cancelada: `gone` (011b). Cadastrada, em análise, arquivada ou inexistente: `null`.
 */
export async function storePage(
  db: Db,
  slug: string,
): Promise<StorePage | null> {
  const resolved = await resolveSlug(db, slug);
  if (!resolved) return null;
  const [s] = await db
    .select({
      storeId: stores.id,
      status: stores.status,
      name: stores.name,
      slug: stores.slug,
      city: stores.city,
      state: stores.state,
      about: stores.about,
      hours: stores.hours,
      citySlug: stores.citySlug,
      whatsapp: stores.whatsapp,
      logoPublicId: stores.logoPublicId,
      coverPublicId: stores.coverPublicId,
    })
    .from(stores)
    .where(eq(stores.id, resolved.storeId));
  if (!s) return null;
  if (s.status === "suspended") return { kind: "suspended" };
  if (s.status === "canceled") return { kind: "gone" };
  if (!isStoreLive(s.status)) return null;
  if (resolved.redirected)
    return { kind: "redirect", to: `/loja/${resolved.slug}` };
  return {
    kind: "store",
    storeId: s.storeId,
    name: s.name,
    slug: s.slug,
    city: s.city,
    state: s.state,
    about: s.about,
    hours: s.hours as StoreHours,
    citySlug: s.citySlug,
    whatsapp: s.whatsapp,
    logoPublicId: s.logoPublicId,
    coverPublicId: s.coverPublicId,
    initials: initialsOf(s.name),
  };
}

/** "Ver N veículos" com a contagem ao vivo (SHW-FR-005). */
export async function countMatches(
  db: Db,
  scope: Scope,
  filters: Filters,
): Promise<number> {
  const [{ n }] = await db
    .select({ n: count() })
    .from(vehicles)
    .innerJoin(stores, eq(stores.id, vehicles.storeId))
    .where(whereOf(scope, filters));
  return n;
}

/** Marcas com veículo visível no escopo, para o filtro [6d]. */
/** Opção de filtro com subtipos (marca → modelos, estado → cidades), 012. */
export type FacetOption = {
  slug: string;
  name: string;
  count: number;
  children?: FacetOption[];
};

export async function facets(
  db: Db,
  scope: Scope,
): Promise<{
  /** Marcas com os modelos dentro (filtro em árvore, 012). */
  makes: FacetOption[];
  /** Estados com as cidades dentro (filtro em árvore, 012). */
  cities: FacetOption[];
}> {
  const modelRows = await db
    .select({
      slug: vehicles.makeSlug,
      name: vehicles.make,
      modelSlug: vehicles.modelSlug,
      model: vehicles.model,
      count: count(),
    })
    .from(vehicles)
    .innerJoin(stores, eq(stores.id, vehicles.storeId))
    .where(publicVisible(scope))
    .groupBy(
      vehicles.makeSlug,
      vehicles.make,
      vehicles.modelSlug,
      vehicles.model,
    )
    .orderBy(vehicles.make, vehicles.model);
  const rows = modelRows.map(({ slug, name, count }) => ({
    slug,
    name,
    count,
  }));
  const cityRows = await db
    .select({
      slug: stores.citySlug,
      city: stores.city,
      state: stores.state,
      count: count(),
    })
    .from(vehicles)
    .innerJoin(stores, eq(stores.id, vehicles.storeId))
    .where(publicVisible(scope))
    .groupBy(stores.citySlug, stores.city, stores.state)
    .orderBy(desc(count()), stores.city);
  const states = new Map<string, FacetOption>();
  for (const c of cityRows) {
    if (!c.slug) continue;
    const uf = c.state.toUpperCase();
    const state = states.get(uf) ?? {
      slug: uf.toLowerCase(),
      name: STATE_NAME[uf] ?? uf,
      count: 0,
      children: [],
    };
    state.count += c.count;
    state.children!.push({ slug: c.slug, name: c.city, count: c.count });
    states.set(uf, state);
  }
  return {
    makes: knownMakes(rows).map((m) => ({
      ...m,
      children: modelRows
        .filter((r) => r.slug === m.slug && r.modelSlug && r.model)
        .reduce<FacetOption[]>((acc, r) => {
          const slug = `${m.slug}--${r.modelSlug}`;
          const seen = acc.find((x) => x.slug === slug);
          if (seen) seen.count += r.count;
          else acc.push({ slug, name: r.model!, count: r.count });
          return acc;
        }, []),
    })),
    cities: [...states.values()].sort((a, b) =>
      a.name.localeCompare(b.name, "pt-BR"),
    ),
  };
}

export type VehiclePage =
  | {
      kind: "vehicle";
      vehicleId: string;
      path: string;
      /** Divulgado na vitrine agora; oculto pela CajuGo abre como do catálogo. */
      shared: boolean;
      /** `false` no oculto pela CajuGo: fora do Google e do sitemap (007b, D3). */
      indexable: boolean;
      make: string | null;
      model: string | null;
      version: string | null;
      yearManufacture: number | null;
      yearModel: number | null;
      mileageKm: number | null;
      priceCents: number | null;
      installmentCents: number | null;
      transmission: string | null;
      fuel: string | null;
      body: string | null;
      color: string | null;
      doors: number | null;
      engine: string | null;
      plateEnd: string | null;
      description: string | null;
      photos: string[];
      badges: string[];
      conditions: string[];
      features: string[];
      whatsappUrl: string;
      /** Simulador [14b]; `null` sem "Exibir parcela estimada" ou sem preço (BUY-FR-001). */
      simulator: SimulatorSetup | null;
      /** Marca e modelo nos endereços de descoberta (DSC-FR-008). */
      makeSlug: string | null;
      modelSlug: string | null;
      store: {
        name: string;
        slug: string;
        city: string;
        state: string;
        citySlug: string | null;
        initials: string;
        logoPublicId: string | null;
      };
    }
  | {
      kind: "unavailable";
      similar: PublicCard[];
      /** Só de vendido, para o `Offer` como `SoldOut` (SEO.md); excluído não expõe nada. */
      soldCar: {
        path: string;
        make: string | null;
        model: string | null;
        version: string | null;
        yearModel: number | null;
        mileageKm: number | null;
        priceCents: number | null;
        storeName: string;
      } | null;
    }
  | { kind: "suspended" };

const labels = (keys: string[], map: Record<string, string>) =>
  keys.flatMap((k) => (map[k] ? [map[k]] : []));

/** Veículos parecidos para [12d]: da mesma marca, senão da mesma cidade. */
async function similarTo(
  db: Db,
  v: { id: string; makeSlug: string | null; city: string },
): Promise<PublicCard[]> {
  const others = ne(vehicles.id, v.id);
  const find = (extra: SQL | undefined) =>
    baseQuery(db)
      .where(and(publicVisible("showcase"), others, extra))
      .orderBy(desc(vehicles.rankScore), desc(vehicles.id))
      .limit(4);
  let rows = v.makeSlug ? await find(eq(vehicles.makeSlug, v.makeSlug)) : [];
  if (!rows.length) rows = await find(eq(stores.city, v.city));
  return toCards(db, rows);
}

/**
 * Página do veículo [1b] (SHW-FR-008, 010, 011). Colunas escolhidas à mão: placa
 * inteira, chassi e documento nem são lidos (SHW-SEC-001).
 */
export async function vehiclePage(
  db: Db,
  vehicleId: string,
): Promise<VehiclePage | null> {
  const [v] = await db
    .select({
      id: vehicles.id,
      status: vehicles.status,
      shared: vehicles.shareOnCajugo,
      make: vehicles.make,
      makeSlug: vehicles.makeSlug,
      modelSlug: vehicles.modelSlug,
      citySlug: stores.citySlug,
      model: vehicles.model,
      version: vehicles.version,
      yearManufacture: vehicles.yearManufacture,
      yearModel: vehicles.yearModel,
      mileageKm: vehicles.mileageKm,
      priceCents: vehicles.priceCents,
      fipePriceCents: vehicles.fipePriceCents,
      showInstallment: vehicles.showInstallment,
      transmission: vehicles.transmission,
      fuel: vehicles.fuel,
      body: vehicles.body,
      color: vehicles.color,
      doors: vehicles.doors,
      engine: vehicles.engine,
      plateEnd: vehicles.plateEnd,
      description: vehicles.description,
      conditions: vehicles.conditions,
      features: vehicles.features,
      contactWhatsapp: vehicles.contactWhatsapp,
      storeStatus: stores.status,
      storeName: stores.name,
      storeSlug: stores.slug,
      city: stores.city,
      state: stores.state,
      storeWhatsapp: stores.whatsapp,
      logoPublicId: stores.logoPublicId,
    })
    .from(vehicles)
    .innerJoin(stores, eq(stores.id, vehicles.storeId))
    .where(eq(vehicles.id, vehicleId));
  if (!v) return null;
  if (v.storeStatus === "suspended") return { kind: "suspended" };
  if (!isStoreLive(v.storeStatus)) return null;
  if (v.status === "sold" || v.status === "deleted")
    return {
      kind: "unavailable",
      similar: await similarTo(db, v),
      soldCar:
        v.status === "sold"
          ? {
              path: vehiclePath({ ...v, id: v.id }),
              make: v.make,
              model: v.model,
              version: v.version,
              yearModel: v.yearModel,
              mileageKm: v.mileageKm,
              priceCents: v.priceCents,
              storeName: v.storeName,
            }
          : null,
    };
  if (v.status !== "published" && v.status !== "hidden") return null;
  const hidden = v.status === "hidden";

  const photos = await db
    .select({ publicId: vehiclePhotos.publicId })
    .from(vehiclePhotos)
    .where(eq(vehiclePhotos.vehicleId, v.id))
    .orderBy(asc(vehiclePhotos.position));
  const s = await getSettings(db);
  const path = vehiclePath({ ...v, id: v.id });
  const name = [v.make, v.version ?? v.model, v.yearModel]
    .filter(Boolean)
    .join(" ");
  const price = v.priceCents !== null ? ` por ${brl(v.priceCents)}` : "";
  const contact = v.contactWhatsapp ?? v.storeWhatsapp;
  const conditions = (v.conditions ?? {}) as Record<string, boolean>;

  return {
    kind: "vehicle",
    vehicleId: v.id,
    path,
    shared: v.shared && !hidden,
    indexable: !hidden,
    make: v.make,
    model: v.model,
    version: v.version,
    yearManufacture: v.yearManufacture,
    yearModel: v.yearModel,
    mileageKm: v.mileageKm,
    priceCents: v.priceCents,
    installmentCents:
      v.showInstallment && v.priceCents !== null
        ? estimatedInstallment({
            priceCents: v.priceCents,
            downBps: s.installment_down_bps,
            months: s.installment_months,
            rateBps: s.installment_rate_bps,
          })
        : null,
    transmission: v.transmission
      ? ((TRANSMISSIONS as Record<string, string>)[v.transmission] ?? null)
      : null,
    fuel: v.fuel ? ((FUELS as Record<string, string>)[v.fuel] ?? null) : null,
    body: v.body ? ((BODIES as Record<string, string>)[v.body] ?? null) : null,
    color: v.color,
    doors: v.doors,
    engine: v.engine,
    plateEnd: v.plateEnd,
    description: v.description,
    photos: photos.map((p) => p.publicId),
    badges: pickBadges(v),
    // Na ordem do PRD: o banco reordena as chaves do JSON.
    conditions: Object.entries(CONDITIONS)
      .filter(([key]) => conditions[key])
      .map(([, label]) => label),
    features: labels(v.features, FEATURES),
    whatsappUrl: whatsappLink(
      contact,
      `Olá! Tenho interesse no ${name}${price}, anunciado na CajuGo: ${appUrl()}${path}`,
    ),
    simulator:
      v.showInstallment && v.priceCents !== null
        ? {
            priceCents: v.priceCents,
            downBps: s.installment_down_bps,
            months: s.installment_months,
            rateBps: s.installment_rate_bps,
            whatsappNumber: contact,
            title: name,
            url: `${appUrl()}${path}`,
          }
        : null,
    makeSlug: v.makeSlug,
    modelSlug: v.modelSlug,
    store: {
      name: v.storeName,
      slug: v.storeSlug,
      city: v.city,
      state: v.state,
      citySlug: v.citySlug,
      initials: initialsOf(v.storeName),
      logoPublicId: v.logoPublicId,
    },
  };
}

/** Endereço atual de um veículo público; `null` se não tem página. */
async function vehicleGate(
  db: Db,
  id: string,
  requested: string | null,
): Promise<GateDecision> {
  const [v] = await db
    .select({
      status: vehicles.status,
      make: vehicles.make,
      model: vehicles.model,
      yearModel: vehicles.yearModel,
      city: stores.city,
      state: stores.state,
      storeStatus: stores.status,
    })
    .from(vehicles)
    .innerJoin(stores, eq(stores.id, vehicles.storeId))
    .where(eq(vehicles.id, id));
  if (!v) return "not-found";
  const storeShows =
    v.storeStatus === "suspended" || isStoreLive(v.storeStatus);
  const hasPage = ["published", "hidden", "sold", "deleted"].includes(v.status);
  if (!storeShows || !hasPage) return "not-found";
  const current = vehiclePath({ ...v, id });
  return requested === current ? "ok" : { redirect: current };
}

/**
 * Status real de `/loja/*` e `/v/*` (SHW-FR-014, ADR 0013), decidido no proxy antes de
 * a página responder: atual, redirecionamento permanente ou 404.
 */
export async function gateDecision(
  db: Db,
  path: string,
): Promise<GateDecision> {
  const parts = path.split("/").filter(Boolean);
  if (parts[0] === "v" && parts.length === 2) {
    const id = idFromVehicleParam(parts[1]);
    return id ? vehicleGate(db, id, path) : "not-found";
  }
  if (parts[0] === "loja" && parts[2] === "v" && parts.length === 4) {
    const id = idFromVehicleParam(parts[3]);
    return id ? vehicleGate(db, id, null) : "not-found";
  }
  // Descoberta: o índice sempre existe; o resto, se a marca/modelo/cidade já existiu.
  if (parts[0] === "carros" && parts.length > 1) {
    const key = parseDiscoveryPath(parts.slice(1));
    return key && (await discoveryExists(db, key)) ? "ok" : "not-found";
  }
  if (parts[0] === "loja" && parts.length === 2) {
    const page = await storePage(db, parts[1]);
    if (!page) return "not-found";
    if (page.kind === "gone") return "gone";
    return page.kind === "redirect" ? { redirect: page.to } : "ok";
  }
  return "ok";
}

/** Endereços públicos para o sitemap (SHW-FR-015): só o que tem página indexável. */
export async function sitemapEntries(
  db: Db,
  kind: "stores" | "vehicles" | "discovery",
): Promise<{ path: string; lastModified: Date }[]> {
  if (kind === "discovery") return discoverySitemap(db);
  if (kind === "stores") {
    const rows = await db
      .select({ slug: stores.slug, updatedAt: stores.updatedAt })
      .from(stores)
      .where(inArray(stores.status, [...LIVE_STATUSES]));
    return rows.map((r) => ({
      path: `/loja/${r.slug}`,
      lastModified: r.updatedAt,
    }));
  }
  const rows = await db
    .select({
      id: vehicles.id,
      make: vehicles.make,
      model: vehicles.model,
      yearModel: vehicles.yearModel,
      city: stores.city,
      state: stores.state,
      updatedAt: vehicles.updatedAt,
    })
    .from(vehicles)
    .innerJoin(stores, eq(stores.id, vehicles.storeId))
    .where(
      and(
        eq(vehicles.status, "published"),
        inArray(stores.status, [...LIVE_STATUSES]),
      ),
    );
  return rows.map((r) => ({ path: vehiclePath(r), lastModified: r.updatedAt }));
}

export { publicVisible, type Scope } from "./visibility";
export { parseRefCode, REF_COOKIE, vehiclePath } from "./urls";
export { savedSearch, searchLabel, type SavedSearch } from "./saved-search";
export { listSourceSchema, type ListSource } from "./list-source";
export {
  discoveryIndex,
  discoveryLinks,
  discoveryPage,
  type DiscoveryPage,
} from "./discovery";

/** Contagens do painel do admin (012b). */
export { storeStock, vehiclesSnapshot } from "./snapshot";
