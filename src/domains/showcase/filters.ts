import type { DiscoveryKey } from "./discovery-urls";
import {
  isVehicleType,
  typeByPath,
  vehicleType,
  type VehicleTypeSlug,
} from "./vehicle-types";

/**
 * Filtros da vitrine na URL (SHW-FR-005), em português, e o que a consulta usa. Valor
 * inválido é ignorado, nunca vira erro nem chega ao banco (SHW-SEC-004).
 */

const SORTS = {
  relevantes: "relevance",
  "menor-preco": "price_asc",
  "maior-preco": "price_desc",
  recentes: "newest",
  "menor-km": "km_asc",
  "ano-novo": "year_desc",
} as const;

export type Sort = (typeof SORTS)[keyof typeof SORTS];

const TRANSMISSIONS: Record<string, string> = {
  manual: "manual",
  automatico: "automatic",
  cvt: "cvt",
  automatizado: "automated",
};

const FUELS: Record<string, string> = {
  flex: "flex",
  gasolina: "gasoline",
  etanol: "ethanol",
  diesel: "diesel",
  eletrico: "electric",
  hibrido: "hybrid",
  gnv: "cng",
};

export const CONDITIONS = {
  novo: "Novos",
  usado: "Usados",
} as const;
export type Condition = keyof typeof CONDITIONS;

export type Filters = {
  /** Tipo de veículo (014, TIP-FR-007): `?tipo=moto`. */
  type?: VehicleTypeSlug;
  /** Novo (0 km) ou usado (com km), 017 HOM-FR-003: `?estado=`. */
  condition?: Condition;
  makes: string[];
  /** Modelos escolhidos dentro de uma marca: "bmw--x1" (marca--modelo), 012. */
  models?: string[];
  /** Cidades no formato do endereço de descoberta ("aracaju-se"), 012. */
  cities?: string[];
  priceFrom?: number;
  priceTo?: number;
  yearFrom?: number;
  yearTo?: number;
  kmTo?: number;
  transmissions: string[];
  fuels: string[];
  sort: Sort;
  q?: string;
};

type Params = Record<string, string | string[] | undefined>;

const one = (v: Params[string]) => (Array.isArray(v) ? v[0] : v) ?? "";

function intIn(v: Params[string], min: number, max: number) {
  const text = one(v).trim();
  if (!/^\d+$/.test(text)) return undefined;
  const n = Number(text);
  return n >= min && n <= max ? n : undefined;
}

const listIn = (v: Params[string], allowed: Record<string, string>) => [
  ...new Set(
    one(v)
      .split(",")
      .map((x) => allowed[x.trim()])
      .filter(Boolean),
  ),
];

export function parseFilters(params: Params): Filters {
  const reais = (v: Params[string]) => {
    const n = intIn(v, 1, 100_000_000);
    return n === undefined ? undefined : n * 100;
  };
  const q = one(params.q).trim().slice(0, 60);
  const type = one(params.tipo);
  // `seminovo` saiu a pedido do dono (2026-11-25): o link antigo vale como usado.
  const condition =
    one(params.estado) === "seminovo" ? "usado" : one(params.estado);
  return {
    ...(isVehicleType(type) ? { type } : {}),
    ...(condition in CONDITIONS ? { condition: condition as Condition } : {}),
    makes: [
      ...new Set(
        one(params.marca)
          .split(",")
          .map((m) => m.trim())
          .filter((m) => /^[a-z0-9-]{1,40}$/.test(m)),
      ),
    ].slice(0, 20),
    ...modelsOf(params.modelo),
    ...citiesOf(params.cidade),
    ...optional("priceFrom", reais(params.preco_de)),
    ...optional("priceTo", reais(params.preco_ate)),
    ...optional("yearFrom", intIn(params.ano_de, 1950, 2100)),
    ...optional("yearTo", intIn(params.ano_ate, 1950, 2100)),
    ...optional("kmTo", intIn(params.km_ate, 1, 2_000_000)),
    transmissions: listIn(params.cambio, TRANSMISSIONS),
    fuels: listIn(params.combustivel, FUELS),
    sort: SORTS[one(params.ordem) as keyof typeof SORTS] ?? "relevance",
    ...(q ? { q } : {}),
  };
}

/** `?modelo=bmw--x1,fiat--argo`: o modelo dentro da marca. */
function modelsOf(v: Params[string]): { models?: string[] } {
  const list = [
    ...new Set(
      one(v)
        .split(",")
        .map((m) => m.trim())
        .filter((m) => /^[a-z0-9-]{1,40}--[a-z0-9-]{1,60}$/.test(m)),
    ),
  ].slice(0, 20);
  return list.length ? { models: list } : {};
}

/** `?cidade=aracaju-se,recife-pe` (cidade + UF sem acento), como no `city_slug`. */
function citiesOf(v: Params[string]): { cities?: string[] } {
  const list = [
    ...new Set(
      one(v)
        .split(",")
        .map((c) => c.trim())
        .filter((c) => /^[a-z0-9-]{2,60}-[a-z]{2}$/.test(c)),
    ),
  ].slice(0, 10);
  return list.length ? { cities: list } : {};
}

function optional<K extends string>(key: K, value: number | undefined) {
  return (value === undefined ? {} : { [key]: value }) as Partial<
    Record<K, number>
  >;
}

const keyOf = (map: Record<string, string>, value: string) =>
  Object.keys(map).find((k) => map[k] === value)!;

/** Filtros → query string, sem o que está no padrão. */
export function filtersToQuery(f: Filters): string {
  const p = new URLSearchParams();
  if (f.type) p.set("tipo", f.type);
  if (f.condition) p.set("estado", f.condition);
  if (f.makes.length) p.set("marca", f.makes.join(","));
  if (f.models?.length) p.set("modelo", f.models.join(","));
  if (f.cities?.length) p.set("cidade", f.cities.join(","));
  if (f.priceFrom !== undefined) p.set("preco_de", String(f.priceFrom / 100));
  if (f.priceTo !== undefined) p.set("preco_ate", String(f.priceTo / 100));
  if (f.yearFrom !== undefined) p.set("ano_de", String(f.yearFrom));
  if (f.yearTo !== undefined) p.set("ano_ate", String(f.yearTo));
  if (f.kmTo !== undefined) p.set("km_ate", String(f.kmTo));
  if (f.transmissions.length)
    p.set(
      "cambio",
      f.transmissions.map((t) => keyOf(TRANSMISSIONS, t)).join(","),
    );
  if (f.fuels.length)
    p.set("combustivel", f.fuels.map((t) => keyOf(FUELS, t)).join(","));
  if (f.sort !== "relevance") p.set("ordem", keyOf(SORTS, f.sort));
  if (f.q) p.set("q", f.q);
  return p.toString().replaceAll("%2C", ",");
}

/** Quantos filtros estão ativos, para o chip "Filtros" (busca e ordem não contam). */
export function activeFilters(f: Filters): number {
  return (
    (f.makes.length || f.models?.length ? 1 : 0) +
    (f.cities?.length ? 1 : 0) +
    (f.priceFrom !== undefined || f.priceTo !== undefined ? 1 : 0) +
    (f.yearFrom !== undefined || f.yearTo !== undefined ? 1 : 0) +
    (f.kmTo !== undefined ? 1 : 0) +
    (f.transmissions.length ? 1 : 0) +
    (f.fuels.length ? 1 : 0)
  );
}

/** Endereço com os filtros; sem filtro, o caminho puro (canônica limpa). */
/** Vitrine sem tipo; com tipo, a página do tipo (`/motos`), melhor para o SEO. */
export const SHOWCASE_PATH = "/veiculos";

export function filterHref(basePath: string, f: Filters): string {
  if (basePath === SHOWCASE_PATH || typeByPath(basePath)) {
    const base = f.type ? vehicleType(f.type).path : SHOWCASE_PATH;
    const rest = filtersToQuery({ ...f, type: undefined });
    return rest ? `${base}?${rest}` : base;
  }
  const query = filtersToQuery(f);
  return query ? `${basePath}?${query}` : basePath;
}

export function filtersFromQuery(query: string): Filters {
  return parseFilters(Object.fromEntries(new URLSearchParams(query)));
}

/** Passa pela mesma validação da URL: descarta o que foi digitado pela metade. */
export function normalizeFilters(f: Filters): Filters {
  return filtersFromQuery(filtersToQuery(f));
}

export const SORT_OPTIONS: { value: Sort; label: string }[] = [
  { value: "relevance", label: "Mais relevantes" },
  { value: "price_asc", label: "Menor preço" },
  { value: "price_desc", label: "Maior preço" },
  { value: "newest", label: "Mais recentes" },
  { value: "km_asc", label: "Menor km" },
  { value: "year_desc", label: "Ano mais novo" },
];

/** Opções de [6d] (PRD): os demais valores da URL continuam válidos em links. */
export const TRANSMISSION_OPTIONS = [
  { value: "automatic", label: "Automático" },
  { value: "manual", label: "Manual" },
  { value: "cvt", label: "CVT" },
];

export const FUEL_OPTIONS = [
  { value: "flex", label: "Flex" },
  { value: "gasoline", label: "Gasolina" },
  { value: "diesel", label: "Diesel" },
  { value: "hybrid", label: "Híbrido" },
  { value: "electric", label: "Elétrico" },
];

/** A marca da página de descoberta fica fixa: `?marca=` no endereço não troca o recorte. */
export function discoveryFilters(key: DiscoveryKey, filters: Filters): Filters {
  return key.makeSlug ? { ...filters, makes: [] } : filters;
}
