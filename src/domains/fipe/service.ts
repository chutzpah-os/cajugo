import { asc, eq } from "drizzle-orm";
import {
  fipeBrands,
  fipeModels,
  fipePrices,
  fipeYears,
} from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";
import { AppError } from "@/platform/http/errors";
import { logger } from "@/platform/http/logger";
import {
  createFipeClient,
  FipeUnavailable,
  type FipeClient,
} from "@/platform/fipe/client";

/**
 * Tabela FIPE (ADR 0012): o app lê sempre do nosso banco; a API pública só é
 * consultada quando falta o dado ou ele venceu (30 dias). Com a API fora do ar, vale
 * o que está guardado, mesmo vencido (VEH-NFR-004).
 */
export type FipeDeps = { db: Db; fipe?: FipeClient; now?: () => Date };

const FRESH_MS = 30 * 86_400_000;
/** Código de ano que a FIPE usa para "Zero KM". */
const ZERO_KM_CODE = "32000";

const clientOf = (deps: FipeDeps) => deps.fipe ?? createFipeClient();
const nowOf = (deps: FipeDeps) => deps.now?.() ?? new Date();
const stale = (deps: FipeDeps, at: Date | undefined) =>
  !at || nowOf(deps).getTime() - at.getTime() > FRESH_MS;

const UNAVAILABLE = () =>
  new AppError(
    "unavailable",
    "Lista indisponível",
    503,
    "Lista indisponível agora. Tente de novo em instantes.",
  );

/**
 * Lê do banco; se vazio ou vencido, tenta renovar pela API. Falha da API com algo
 * guardado → o guardado; sem nada guardado → 503.
 */
async function cached<T>(
  deps: FipeDeps,
  read: () => Promise<{ rows: T[]; syncedAt?: Date }>,
  refresh: () => Promise<void>,
): Promise<T[]> {
  const first = await read();
  if (first.rows.length && !stale(deps, first.syncedAt)) return first.rows;
  try {
    await refresh();
  } catch (error) {
    if (!(error instanceof FipeUnavailable)) throw error;
    logger.warn("fipe.unavailable", { error: error.message });
    if (first.rows.length) return first.rows;
    throw UNAVAILABLE();
  }
  return (await read()).rows;
}

const oldest = (dates: Date[]) =>
  dates.length
    ? new Date(Math.min(...dates.map((d) => d.getTime())))
    : undefined;

/** Marcas de carro (VEH-FR-005). */
export async function brands(deps: FipeDeps) {
  return cached(
    deps,
    async () => {
      const rows = await deps.db
        .select()
        .from(fipeBrands)
        .orderBy(asc(fipeBrands.name));
      return {
        rows: rows.map((r) => ({ id: r.id, name: r.name })),
        syncedAt: oldest(rows.map((r) => r.syncedAt)),
      };
    },
    async () => {
      const list = await clientOf(deps).brands();
      const at = nowOf(deps);
      for (const b of list)
        await deps.db
          .insert(fipeBrands)
          .values({ id: b.id, name: b.name, syncedAt: at })
          .onConflictDoUpdate({
            target: fipeBrands.id,
            set: { name: b.name, syncedAt: at },
          });
    },
  );
}

/** Família do modelo (o "Modelo" da tela): a primeira palavra do nome da FIPE. */
const familyOf = (name: string) => name.trim().split(/\s+/)[0].toUpperCase();

/** Modelos da marca agrupados por família, com as versões da FIPE (VEH-FR-005). */
export async function models(deps: FipeDeps, brandId: string) {
  const list = await cached(
    deps,
    async () => {
      const rows = await deps.db
        .select()
        .from(fipeModels)
        .where(eq(fipeModels.brandId, brandId))
        .orderBy(asc(fipeModels.name));
      return {
        rows: rows.map((r) => ({ id: r.id, name: r.name })),
        syncedAt: oldest(rows.map((r) => r.syncedAt)),
      };
    },
    async () => {
      const fetched = await clientOf(deps).models(brandId);
      const at = nowOf(deps);
      for (const m of fetched)
        await deps.db
          .insert(fipeModels)
          .values({ id: m.id, brandId, name: m.name, syncedAt: at })
          .onConflictDoUpdate({
            target: fipeModels.id,
            set: { name: m.name, syncedAt: at },
          });
    },
  );
  const families = new Map<string, { id: string; name: string }[]>();
  for (const v of list) {
    const f = familyOf(v.name);
    families.set(f, [...(families.get(f) ?? []), v]);
  }
  return [...families].map(([family, versions]) => ({ family, versions }));
}

/** Anos/combustível de uma versão; id = `{modelo}:{código}` (VEH-FR-005). */
export async function years(deps: FipeDeps, brandId: string, modelId: string) {
  return cached(
    deps,
    async () => {
      const rows = await deps.db
        .select()
        .from(fipeYears)
        .where(eq(fipeYears.modelId, modelId))
        .orderBy(asc(fipeYears.id));
      return {
        rows: rows.map((r) => ({ id: r.id, label: r.label })),
        syncedAt: oldest(rows.map((r) => r.syncedAt)),
      };
    },
    async () => {
      const fetched = await clientOf(deps).years(brandId, modelId);
      const at = nowOf(deps);
      for (const y of fetched) {
        const id = `${modelId}:${y.code}`;
        await deps.db
          .insert(fipeYears)
          .values({ id, modelId, label: y.label, syncedAt: at })
          .onConflictDoUpdate({
            target: fipeYears.id,
            set: { label: y.label, syncedAt: at },
          });
      }
    },
  );
}

export type FipeReference = {
  fipeCode: string;
  priceCents: number;
  month: string;
};

/**
 * Referência de preço da versão no ano (VEH-FR-007), renovada depois de 30 dias.
 * Sem referência (API fora e nada guardado) → `null`: o preço continua obrigatório.
 */
export async function reference(
  deps: FipeDeps,
  brandId: string,
  modelId: string,
  yearCode: string,
): Promise<FipeReference | null> {
  const yearId = `${modelId}:${yearCode}`;
  try {
    const [row] = await cached(
      deps,
      async () => {
        const rows = await deps.db
          .select()
          .from(fipePrices)
          .where(eq(fipePrices.yearId, yearId));
        return { rows, syncedAt: rows[0]?.fetchedAt };
      },
      async () => {
        const p = await clientOf(deps).price(brandId, modelId, yearCode);
        const at = nowOf(deps);
        await deps.db
          .insert(fipePrices)
          .values({ yearId, ...p, fetchedAt: at })
          .onConflictDoUpdate({
            target: fipePrices.yearId,
            set: { ...p, fetchedAt: at },
          });
      },
    );
    return row
      ? { fipeCode: row.fipeCode, priceCents: row.priceCents, month: row.month }
      : null;
  } catch (error) {
    if (error instanceof AppError && error.status === 503) return null;
    throw error;
  }
}

export type Identification = {
  make: string;
  model: string;
  version: string | null;
  yearModel: number | null;
  reference: FipeReference | null;
};

/**
 * Confere a escolha da tela contra a FIPE guardada (VEH-FR-005): a versão é da
 * marca e o ano é da versão. Devolve os nomes (marca, família, versão), o ano modelo
 * ("Zero KM" = ano corrente) e a referência do mês; escolha inválida → erro no campo.
 */
export async function identify(
  deps: FipeDeps,
  input: { brandId: string; modelId?: string | null; yearId?: string | null },
): Promise<Identification> {
  const fail = (field: string, message: string) =>
    AppError.validation([{ field, code: "invalid", message }]);
  const brand = (await brands(deps)).find((b) => b.id === input.brandId);
  if (!brand) throw fail("fipeBrandId", "Escolha a marca da lista.");
  if (!input.modelId)
    return {
      make: brand.name,
      model: "",
      version: null,
      yearModel: null,
      reference: null,
    };

  const family = (await models(deps, brand.id)).find((f) =>
    f.versions.some((v) => v.id === input.modelId),
  );
  const version = family?.versions.find((v) => v.id === input.modelId);
  if (!family || !version)
    throw fail("fipeModelId", "Escolha a versão da lista.");
  if (!input.yearId)
    return {
      make: brand.name,
      model: family.family,
      version: version.name,
      yearModel: null,
      reference: null,
    };

  const year = (await years(deps, brand.id, version.id)).find(
    (y) => y.id === input.yearId,
  );
  if (!year) throw fail("fipeYearId", "Escolha o ano da lista.");
  const code = year.id.split(":")[1];
  const yearModel = code.startsWith(ZERO_KM_CODE)
    ? Number(
        new Intl.DateTimeFormat("en-CA", {
          timeZone: "America/Sao_Paulo",
          year: "numeric",
        }).format(nowOf(deps)),
      )
    : Number(code.split("-")[0]);
  return {
    make: brand.name,
    model: family.family,
    version: version.name,
    yearModel,
    reference: await reference(deps, brand.id, version.id, code),
  };
}
