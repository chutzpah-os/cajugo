import {
  and,
  count,
  countDistinct,
  desc,
  eq,
  gte,
  inArray,
  lte,
  sql,
  type SQL,
} from "drizzle-orm";
import { getSettings } from "@/domains/settings/service";
import {
  isStoreLive,
  LIVE_STATUSES,
  resolveSlug,
} from "@/domains/stores/service";
import { estimatedInstallment } from "@/platform/br/installment";
import { plainText } from "@/platform/br/slug";
import { stores, vehiclePhotos, vehicles } from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";
import type { Filters } from "./filters";
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
  const rows = await baseQuery(db)
    .where(where)
    .orderBy(desc(vehicles.rankScore), desc(vehicles.id))
    .limit(PAGE);
  return {
    items: await toCards(db, rows),
    total: totals.total,
    stores: totals.stores,
    nextCursor: null,
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
