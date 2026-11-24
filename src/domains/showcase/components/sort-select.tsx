"use client";

import { filterHref, SORT_OPTIONS, type Filters, type Sort } from "../filters";
import { useCatalogNavigation } from "./catalog-navigation";

/** Ordenação ao lado do contador [1a] (SHW-FR-006); fica no endereço. */
export function SortSelect({
  filters,
  basePath,
}: {
  filters: Filters;
  basePath: string;
}) {
  const { navigate } = useCatalogNavigation();
  return (
    <label className="shrink-0">
      <span className="sr-only lg:not-sr-only lg:text-[13px] lg:text-text-3">
        Ordenar:{" "}
      </span>
      <select
        key={filters.sort}
        defaultValue={filters.sort}
        data-testid="sort-select"
        onChange={(e) =>
          navigate?.(
            filterHref(basePath, {
              ...filters,
              sort: e.target.value as Sort,
            }),
          )
        }
        className="h-11 rounded-input bg-transparent text-sm font-semibold text-ink"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
