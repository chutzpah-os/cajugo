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
  promo,
  toolbarOnDesktop = false,
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
  /** Card de divulgação na grade (Caju Indica). */
  promo?: ReactNode;
  /** A vitrine mostra o quadro Buscar/Vender também no desktop (014). */
  toolbarOnDesktop?: boolean;
}) {
  const query = filtersToQuery(filters);
  return (
    <CatalogNavigation>
      {toolbar && (
        <div
          className={
            toolbarOnDesktop
              ? "-mx-4 border-b border-line bg-surface px-4 pb-3 lg:-mx-8 lg:bg-bg lg:px-8 lg:py-5"
              : "-mx-4 border-b border-line bg-surface px-4 pb-3 lg:hidden"
          }
        >
          {toolbar}
        </div>
      )}
      <div
        className={
          sidebar
            ? "lg:-mx-8 lg:grid lg:min-h-[calc(100dvh-64px)] lg:grid-cols-[280px_minmax(0,1fr)] lg:items-stretch"
            : ""
        }
      >
        {sidebar && (
          <aside
            data-testid="filters-side"
            className="hidden border-r border-line bg-surface px-6 py-6 lg:block"
          >
            {sidebar}
          </aside>
        )}
        <div
          className={`flex flex-col gap-4 pt-4 ${sidebar ? "lg:px-10 lg:py-7" : "lg:pt-7"}`}
        >
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-col gap-1.5 lg:flex-row lg:items-baseline lg:justify-between lg:gap-4">
              <div className="flex flex-col gap-1.5 lg:block">
                <h1 className="inline text-xl leading-tight font-extrabold tracking-[-0.02em] text-pretty lg:text-[22px]">
                  {title}
                </h1>
                {count && (
                  <span
                    aria-hidden
                    className="hidden text-[13px] font-semibold text-text-3 lg:inline"
                  >
                    {" "}
                    · {count}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-3 lg:justify-end">
                <p
                  className="text-[13px] text-text-3 lg:sr-only"
                  data-testid="catalog-count"
                >
                  {count}
                </p>
                {sort}
              </div>
            </div>
            {intro}
          </div>
          <CatalogList
            key={query}
            result={result}
            cloudName={cloudName}
            showStore={showStore}
            source={source}
            query={query}
            empty={empty}
            promo={promo}
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
