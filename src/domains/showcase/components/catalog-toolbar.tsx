import { filtersToQuery, type Filters } from "../filters";
import type { MakeOption } from "./filters-form";
import { FiltersSheet } from "./filters-sheet";
import { SearchBox } from "./search-box";
import type { ListSource } from "../list-source";

/** Busca e chips de filtro [1a]; a busca mantém os filtros já escolhidos. */
export function CatalogToolbar({
  filters,
  makes,
  total,
  basePath,
  source,
  lockMake = false,
  cities,
}: {
  filters: Filters;
  makes: MakeOption[];
  total: number;
  basePath: string;
  source: ListSource;
  lockMake?: boolean;
  cities?: MakeOption[];
}) {
  const others = new URLSearchParams(
    filtersToQuery({ ...filters, q: undefined }),
  );
  return (
    <div className="flex flex-col gap-3">
      <SearchBox filters={filters} basePath={basePath} hidden={[...others]} />
      <FiltersSheet
        filters={filters}
        makes={makes}
        total={total}
        basePath={basePath}
        source={source}
        lockMake={lockMake}
        cities={cities}
      />
    </div>
  );
}

/** Busca no cabeçalho do desktop [15a]: mantém os filtros já escolhidos. */
export function HeaderSearch({
  filters,
  basePath,
}: {
  filters: Filters;
  basePath: string;
}) {
  const others = new URLSearchParams(
    filtersToQuery({ ...filters, q: undefined }),
  );
  return (
    <SearchBox
      filters={filters}
      basePath={basePath}
      hidden={[...others]}
      size="sm"
    />
  );
}
