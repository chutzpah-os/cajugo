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
import { getSettings } from "@/domains/settings/service";
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
import { stores, vehiclePhotos, vehicles } from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";
import type { Filters, Sort } from "./filters";
import { vehiclePath } from "./urls";

/**
 * Leitura pública dos veículos (spec 006): vitrine, catálogo da loja e página do
 * veículo. Sem sessão. Saída montada à mão: a consulta nem seleciona placa, chassi ou
 * dados de cobrança (SHW-SEC-001).
 */
export type Scope = "showcase" | { storeId: string };

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

/** O que o público pode ver (SHW-SEC-002, SHW-SEC-003). Regra única de todas as listas. */
export function publicVisible(scope: Scope): SQL {
  return and(
    eq(vehicles.status, "published"),
    inArray(stores.status, [...LIVE_STATUSES]),
    scope === "showcase"
      ? eq(vehicles.shareOnCajugo, true)
      : eq(vehicles.storeId, scope.storeId),
  )!;
}

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
    query
      ? sql`${vehicles.search} @@ to_tsquery('simple', ${query})`
      : undefined,
    f.makes.length ? inArray(vehicles.makeSlug, f.makes) : undefined,
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

export type StorePage =
  | {
      kind: "store";
      storeId: string;
      name: string;
      slug: string;
      city: string;
      state: string;
      about: string | null;
      whatsapp: string;
      logoPublicId: string | null;
      coverPublicId: string | null;
      initials: string;
    }
  | { kind: "suspended" }
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
 * Cadastrada, em análise, cancelada, arquivada ou inexistente: `null`.
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
      whatsapp: stores.whatsapp,
      logoPublicId: stores.logoPublicId,
      coverPublicId: stores.coverPublicId,
    })
    .from(stores)
    .where(eq(stores.id, resolved.storeId));
  if (!s) return null;
  if (s.status === "suspended") return { kind: "suspended" };
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
export async function facets(
  db: Db,
  scope: Scope,
): Promise<{ makes: { slug: string; name: string; count: number }[] }> {
  const rows = await db
    .select({ slug: vehicles.makeSlug, name: vehicles.make, count: count() })
    .from(vehicles)
    .innerJoin(stores, eq(stores.id, vehicles.storeId))
    .where(publicVisible(scope))
    .groupBy(vehicles.makeSlug, vehicles.make)
    .orderBy(vehicles.make);
  return {
    makes: rows.flatMap((r) =>
      r.slug && r.name ? [{ slug: r.slug, name: r.name, count: r.count }] : [],
    ),
  };
}

export type VehiclePage =
  | {
      kind: "vehicle";
      vehicleId: string;
      path: string;
      shared: boolean;
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
      store: {
        name: string;
        slug: string;
        city: string;
        state: string;
        initials: string;
        logoPublicId: string | null;
      };
    }
  | { kind: "unavailable"; similar: PublicCard[] }
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
    return { kind: "unavailable", similar: await similarTo(db, v) };
  if (v.status !== "published") return null;

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
  const conditions = (v.conditions ?? {}) as Record<string, boolean>;

  return {
    kind: "vehicle",
    vehicleId: v.id,
    path,
    shared: v.shared,
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
      v.contactWhatsapp ?? v.storeWhatsapp,
      `Olá! Tenho interesse no ${name}${price}, anunciado na CajuGo: ${appUrl()}${path}`,
    ),
    store: {
      name: v.storeName,
      slug: v.storeSlug,
      city: v.city,
      state: v.state,
      initials: initialsOf(v.storeName),
      logoPublicId: v.logoPublicId,
    },
  };
}
