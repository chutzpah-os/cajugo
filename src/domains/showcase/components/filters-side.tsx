import { filtersToQuery, type Filters } from "../filters";
import { FiltersForm, type MakeOption } from "./filters-form";
import type { ListSource } from "../list-source";

/** Filtros em coluna lateral no desktop [15a]; a ordem fica ao lado do contador. */
export function FiltersSide({
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
  return (
    <section aria-labelledby="filtros-lateral" className="flex flex-col gap-4">
      <h2 id="filtros-lateral" className="text-lg font-extrabold">
        Filtros
      </h2>
      <FiltersForm
        key={filtersToQuery(filters)}
        filters={filters}
        makes={makes}
        total={total}
        basePath={basePath}
        source={source}
        idPrefix="lateral"
        layout="side"
        showSort={false}
        lockMake={lockMake}
        cities={cities}
      />
    </section>
  );
}
