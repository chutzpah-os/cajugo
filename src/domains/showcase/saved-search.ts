import { FUELS, TRANSMISSIONS } from "@/domains/vehicles/service";
import { discoveryPath } from "./discovery-urls";
import { discoveryFilters, filtersFromQuery, filtersToQuery } from "./filters";
import { discoveryKeyOf, type ListSource } from "./list-source";

/**
 * Busca guardada pelo "Avisar quando chegar" (ALR-FR-001): os filtros normalizados
 * como na URL, sem a ordenação (não muda o que atende), e a página de descoberta.
 * O mesmo formato serve para comparar buscas iguais (ALR-FR-006) e achar compatíveis.
 */
export type SavedSearch = { query: string; discoveryPath: string | null };

/** Só vitrine e descoberta têm alerta; catálogo de loja e página inválida, `null`. */
export function savedSearch(
  source: ListSource,
  query: string,
): SavedSearch | null {
  const filters = { ...filtersFromQuery(query), sort: "relevance" as const };
  if (source === null)
    return { query: filtersToQuery(filters), discoveryPath: null };
  if (source.kind !== "discovery") return null;
  const key = discoveryKeyOf(source.path);
  if (!key) return null;
  return {
    query: filtersToQuery(discoveryFilters(key, filters)),
    discoveryPath: discoveryPath(key),
  };
}

const reais = (cents: number) =>
  `R$ ${Math.round(cents / 100).toLocaleString("pt-BR")}`;
const km = (n: number) => `${n.toLocaleString("pt-BR")} km`;

function range(
  from: number | undefined,
  to: number | undefined,
  fmt: (n: number) => string,
): string | null {
  if (from !== undefined && to !== undefined)
    return `${fmt(from)} a ${fmt(to)}`;
  if (to !== undefined) return `até ${fmt(to)}`;
  if (from !== undefined) return `a partir de ${fmt(from)}`;
  return null;
}

/** "“Toro” · fiat · até R$ 120.000 · Automático" para a tela "Alertas" (ALR-FR-003). */
export function searchLabel(search: SavedSearch): string {
  const f = filtersFromQuery(search.query);
  const labels = (keys: string[], map: Record<string, string>) =>
    keys.map((k) => map[k] ?? k).join(", ");
  const parts = [
    search.discoveryPath,
    f.q ? `“${f.q}”` : null,
    f.makes.length ? f.makes.join(", ") : null,
    range(f.priceFrom, f.priceTo, reais),
    range(f.yearFrom, f.yearTo, String),
    f.kmTo !== undefined ? `até ${km(f.kmTo)}` : null,
    f.transmissions.length ? labels(f.transmissions, TRANSMISSIONS) : null,
    f.fuels.length ? labels(f.fuels, FUELS) : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Qualquer veículo";
}
