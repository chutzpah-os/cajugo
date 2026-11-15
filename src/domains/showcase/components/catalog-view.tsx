import type { ReactNode } from "react";
import { filtersToQuery, type Filters } from "../filters";
import type { SearchResult } from "../service";
import { CatalogList } from "./catalog-list";
import { CatalogNavigation } from "./catalog-navigation";
import type { ListSource } from "../list-source";

/** Lista de veículos da vitrine e do catálogo da loja: mesmo layout (SHW-FR-001, 002). */
export function CatalogView({
  title,
  count,
  result,
  filters,
  source,
  cloudName,
  showStore,
  toolbar,
  sidebar,
  sort,
  intro,
  empty,
}: {
  title: string;
  count: string;
  result: SearchResult;
  filters: Filters;
  source: ListSource;
  cloudName: string;
  showStore: boolean;
  toolbar?: ReactNode;
  sidebar?: ReactNode;
  sort?: ReactNode;
  /** Texto logo abaixo do título (parágrafo da descoberta, DSC-FR-006). */
  intro?: ReactNode;
  empty: ReactNode;
}) {
  const query = filtersToQuery(filters);
  return (
    <CatalogNavigation>
      {toolbar}
      <div className="lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start lg:gap-6">
        {sidebar && (
          <aside data-testid="filters-side" className="hidden lg:block">
            {sidebar}
          </aside>
        )}
        <div
          className={`flex flex-col gap-4 ${sidebar ? "" : "lg:col-span-2"}`}
        >
          <div className="flex flex-col gap-1">
            <h1 className="text-[26px] leading-tight font-extrabold tracking-[-0.02em]">
              {title}
            </h1>
            {intro}
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
            source={source}
            query={query}
            empty={empty}
          />
        </div>
      </div>
    </CatalogNavigation>
  );
}

/** "3 anúncios de 2 lojas" (SHW-FR-001). */
export function showcaseCount(total: number, stores: number): string {
  return `${total} ${total === 1 ? "anúncio" : "anúncios"} de ${stores} ${stores === 1 ? "loja" : "lojas"}`;
}
