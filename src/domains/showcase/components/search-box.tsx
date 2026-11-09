"use client";

import { filterHref, type Filters } from "../filters";
import { useCatalogNavigation } from "./catalog-navigation";

/** Busca [1a]: sem JavaScript vira um GET comum, com os filtros nos campos ocultos. */
export function SearchBox({
  filters,
  basePath,
  hidden,
}: {
  filters: Filters;
  basePath: string;
  hidden: [string, string][];
}) {
  const { navigate } = useCatalogNavigation();
  return (
    <form
      action={basePath}
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const q = String(new FormData(e.currentTarget).get("q")).trim();
        navigate(filterHref(basePath, { ...filters, q: q || undefined }));
      }}
    >
      {hidden.map(([name, value]) => (
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
    </form>
  );
}
