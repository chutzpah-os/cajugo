"use client";

import { filterHref, type Filters } from "../filters";
import { cn } from "@/ui/cn";
import { SearchIcon } from "@/ui/icons";
import { useCatalogNavigation } from "./catalog-navigation";

/** Busca [1a]: sem JavaScript vira um GET comum, com os filtros nos campos ocultos. */
export function SearchBox({
  filters,
  basePath,
  hidden,
  size = "lg",
}: {
  filters: Filters;
  basePath: string;
  hidden: [string, string][];
  /** `sm`: no cabeçalho do desktop [15a]; `lg`: no topo do celular [9a]. */
  size?: "sm" | "lg";
}) {
  const { navigate } = useCatalogNavigation();
  return (
    <form
      action={basePath}
      role="search"
      onSubmit={(e) => {
        if (!navigate) return;
        e.preventDefault();
        const q = String(new FormData(e.currentTarget).get("q")).trim();
        navigate(filterHref(basePath, { ...filters, q: q || undefined }));
      }}
    >
      {hidden.map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <label
        className={cn(
          "flex w-full items-center gap-2.5 bg-bg text-text-3 focus-within:outline-[1.5px] focus-within:outline-ink",
          size === "lg" ? "h-12 rounded-xl px-3.5" : "h-10 rounded-input px-3",
        )}
      >
        <SearchIcon size={size === "lg" ? 18 : 16} />
        <input
          key={filters.q ?? ""}
          type="search"
          name="q"
          defaultValue={filters.q ?? ""}
          maxLength={60}
          aria-label="Buscar veículos"
          placeholder="Buscar marca, modelo ou versão"
          className={cn(
            "h-full min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-text-3",
            size === "lg" ? "text-[15px]" : "text-[13px]",
          )}
        />
      </label>
    </form>
  );
}
