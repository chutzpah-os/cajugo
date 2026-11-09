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

export type Filters = {
  makes: string[];
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
  return {
    makes: [
      ...new Set(
        one(params.marca)
          .split(",")
          .map((m) => m.trim())
          .filter((m) => /^[a-z0-9-]{1,40}$/.test(m)),
      ),
    ].slice(0, 20),
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
  if (f.makes.length) p.set("marca", f.makes.join(","));
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
    (f.makes.length ? 1 : 0) +
    (f.priceFrom !== undefined || f.priceTo !== undefined ? 1 : 0) +
    (f.yearFrom !== undefined || f.yearTo !== undefined ? 1 : 0) +
    (f.kmTo !== undefined ? 1 : 0) +
    (f.transmissions.length ? 1 : 0) +
    (f.fuels.length ? 1 : 0)
  );
}
