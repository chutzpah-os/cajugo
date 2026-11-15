"use client";

import type { ReactNode } from "react";
import { LoadMoreButton, useLoadMore } from "@/ui/load-more";
import { loadMoreAction } from "../actions";
import type { PublicCard as Card, SearchResult } from "../service";
import { useCatalogNavigation } from "./catalog-navigation";
import { CatalogSkeleton } from "./catalog-skeleton";
import { PublicCard } from "./public-card";
import type { ListSource } from "../list-source";

const idOf = (card: Card) => card.vehicleId;

/** Cards com "Carregar mais" (SHW-FR-007): a 1ª página sai no HTML do servidor. */
export function CatalogList({
  result,
  cloudName,
  showStore,
  source,
  query,
  empty,
}: {
  result: SearchResult;
  cloudName: string;
  showStore: boolean;
  source: ListSource;
  query: string;
  empty: ReactNode;
}) {
  const { pending } = useCatalogNavigation();
  const list = useLoadMore<Card>({
    initial: result.items,
    nextCursor: result.nextCursor,
    idOf,
    fetchPage: (cursor) => loadMoreAction({ source, query, cursor }),
  });

  if (pending) return <CatalogSkeleton />;
  if (!list.items.length) return <>{empty}</>;
  return (
    <>
      <ul
        data-testid="catalog-list"
        className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3"
      >
        {list.items.map((card, i) => (
          <PublicCard
            key={card.vehicleId}
            card={card}
            cloudName={cloudName}
            showStore={showStore}
            priority={i === 0}
          />
        ))}
      </ul>
      {list.hasMore && (
        <LoadMoreButton
          busy={list.busy}
          failed={list.failed}
          onClick={list.load}
        />
      )}
      {list.items.some((c) => c.installmentCents !== null) && (
        <p className="text-xs text-text-3">
          *Valor estimado. Simule a sua parcela.
        </p>
      )}
    </>
  );
}
