import { filtersToQuery, type Filters } from "../filters";
import { FiltersForm, type MakeOption } from "./filters-form";

/** Filtros em coluna lateral no desktop [15a]; a ordem fica ao lado do contador. */
export function FiltersSide({
  filters,
  makes,
  total,
  basePath,
  store,
}: {
  filters: Filters;
  makes: MakeOption[];
  total: number;
  basePath: string;
  store: string | null;
}) {
  return (
    <section
      aria-label="Filtros"
      className="rounded-card border border-line bg-surface p-4"
    >
      <FiltersForm
        key={filtersToQuery(filters)}
        filters={filters}
        makes={makes}
        total={total}
        basePath={basePath}
        store={store}
        idPrefix="lateral"
        layout="side"
        showSort={false}
      />
    </section>
  );
}
