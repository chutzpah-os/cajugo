import type { ReactNode } from "react";
import type { SearchResult } from "../service";
import { PublicCard } from "./public-card";

/** Lista de veículos da vitrine e do catálogo da loja: mesmo layout (SHW-FR-001, 002). */
export function CatalogView({
  title,
  count,
  result,
  cloudName,
  showStore,
  toolbar,
  empty,
  footer,
}: {
  title: string;
  count: string;
  result: SearchResult;
  cloudName: string;
  showStore: boolean;
  toolbar?: ReactNode;
  empty: ReactNode;
  footer?: ReactNode;
}) {
  const hasInstallment = result.items.some((c) => c.installmentCents !== null);
  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-[26px] leading-tight font-extrabold tracking-[-0.02em]">
          {title}
        </h1>
        <p className="text-sm text-text-3" data-testid="catalog-count">
          {count}
        </p>
      </div>
      {toolbar}
      {result.items.length ? (
        <ul
          data-testid="catalog-list"
          className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3"
        >
          {result.items.map((card, i) => (
            <PublicCard
              key={card.vehicleId}
              card={card}
              cloudName={cloudName}
              showStore={showStore}
              priority={i === 0}
            />
          ))}
        </ul>
      ) : (
        empty
      )}
      {footer}
      {hasInstallment && (
        <p className="text-xs text-text-3">
          *Valor estimado. Simule a sua parcela.
        </p>
      )}
    </>
  );
}

/** "3 anúncios de 2 lojas" (SHW-FR-001). */
export function showcaseCount(total: number, stores: number): string {
  return `${total} ${total === 1 ? "anúncio" : "anúncios"} de ${stores} ${stores === 1 ? "loja" : "lojas"}`;
}
