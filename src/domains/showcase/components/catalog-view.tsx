import type { ReactNode } from "react";
import { filtersToQuery, type Filters } from "../filters";
import type { SearchResult } from "../service";
import { CatalogList } from "./catalog-list";
import { CatalogNavigation } from "./catalog-navigation";

/** Lista de veículos da vitrine e do catálogo da loja: mesmo layout (SHW-FR-001, 002). */
export function CatalogView({
  title,
  count,
  result,
  filters,
  store,
  cloudName,
  showStore,
  toolbar,
  sort,
  empty,
}: {
  title: string;
  count: string;
  result: SearchResult;
  filters: Filters;
  store: string | null;
  cloudName: string;
  showStore: boolean;
  toolbar?: ReactNode;
  sort?: ReactNode;
  empty: ReactNode;
}) {
  const query = filtersToQuery(filters);
  return (
    <CatalogNavigation>
      {toolbar}
      <div className="flex flex-col gap-1">
        <h1 className="text-[26px] leading-tight font-extrabold tracking-[-0.02em]">
          {title}
        </h1>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-text-3" data-testid="catalog-count">
            {count}
          </p>
          {sort}
        </div>
      </div>
      <CatalogList
        key={query}
        result={result}
        cloudName={cloudName}
        showStore={showStore}
        store={store}
        query={query}
        empty={empty}
      />
    </CatalogNavigation>
  );
}

/** "3 anúncios de 2 lojas" (SHW-FR-001). */
export function showcaseCount(total: number, stores: number): string {
  return `${total} ${total === 1 ? "anúncio" : "anúncios"} de ${stores} ${stores === 1 ? "loja" : "lojas"}`;
}
