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
