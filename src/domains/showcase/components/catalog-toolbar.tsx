import Form from "next/form";
import { filtersToQuery, type Filters } from "../filters";
import { FiltersSheet, type MakeOption } from "./filters-sheet";

/** Busca e chips de filtro [1a]; a busca mantém os filtros já escolhidos. */
export function CatalogToolbar({
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
  const others = new URLSearchParams(
    filtersToQuery({ ...filters, q: undefined }),
  );
  return (
    <div className="flex flex-col gap-3">
      <Form action={basePath} role="search">
        {[...others].map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <input
          key={filters.q ?? ""}
          type="search"
          name="q"
          defaultValue={filters.q ?? ""}
          maxLength={60}
          aria-label="Buscar veículos"
          placeholder="Buscar marca, modelo ou versão"
          className="h-[50px] w-full rounded-input border border-field bg-surface px-3.5 text-base outline-none focus:border-[1.5px] focus:border-caju"
        />
      </Form>
      <FiltersSheet
        filters={filters}
        makes={makes}
        total={total}
        basePath={basePath}
        store={store}
      />
    </div>
  );
}
