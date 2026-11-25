"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { PublicCard } from "@/domains/showcase/components/public-card";
import type { PublicCard as Card } from "@/domains/showcase/service";
import { brl } from "@/platform/br/money";
import { Badge } from "@/ui/badge";
import { Button, ButtonLink } from "@/ui/button";
import { EmptyState } from "@/ui/empty-state";
import { Skeleton } from "@/ui/skeleton";
import { favoriteCardsAction } from "../actions";
import type { FavoriteEntry } from "../favorites";
import { useFavorites } from "../use-favorites";
import { FavoriteButton } from "./favorite-button";

type Load =
  | { state: "loading" }
  | { state: "failed" }
  | {
      state: "ready";
      cards: Map<string, Card>;
      similar: Record<string, string>;
    };

const noop = () => () => {};
/** `false` no servidor e na hidratação: os favoritos só existem no aparelho. */
const useHydrated = () =>
  useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );

/** "R$ 4.000" quando não há centavos; senão "R$ 4.000,50". */
const brlShort = (cents: number) => brl(cents).replace(/,00$/, "");

const loading = <Skeleton className="h-64 w-full rounded-card" />;

/** Baixou desde que favoritou (BUY-FR-006); subiu ou igual, sem selo. */
export function priceDrop(entry: FavoriteEntry, card: Card): number | null {
  if (entry.priceCents === null || card.priceCents === null) return null;
  const drop = entry.priceCents - card.priceCents;
  return drop > 0 ? drop : null;
}

/** Favoritos [14a] (BUY-FR-005 a BUY-FR-008): cards atuais dos veículos guardados. */
export function FavoritesView({ cloudName }: { cloudName: string }) {
  const hydrated = useHydrated();
  const entries = useFavorites();
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [attempt, setAttempt] = useState(0);
  const ids = entries.map((e) => e.id).join(",");

  useEffect(() => {
    if (!ids) return;
    let live = true;
    favoriteCardsAction({ ids: ids.split(",") }).then((r) => {
      if (!live) return;
      setLoad(
        r
          ? {
              state: "ready",
              cards: new Map(r.cards.map((c) => [c.vehicleId, c])),
              similar: r.similar,
            }
          : { state: "failed" },
      );
    });
    return () => {
      live = false;
    };
  }, [ids, attempt]);

  if (!hydrated) return loading;
  if (!entries.length)
    return (
      <EmptyState
        title="Nenhum favorito ainda"
        action={<ButtonLink href="/veiculos">Ver a vitrine</ButtonLink>}
      >
        Toque no coração de um veículo para guardar aqui. Os favoritos ficam
        neste aparelho.
      </EmptyState>
    );
  if (load.state === "failed")
    return (
      <div className="flex flex-col items-start gap-3 rounded-card border border-line p-5">
        <p className="font-bold">Não foi possível carregar seus favoritos.</p>
        <Button
          variant="ghost"
          onClick={() => {
            setLoad({ state: "loading" });
            setAttempt((n) => n + 1);
          }}
        >
          Tentar de novo
        </Button>
      </div>
    );
  if (load.state === "loading") return loading;

  return (
    <ul
      data-testid="favorites-list"
      className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3"
    >
      {entries.map((entry) => {
        const card = load.cards.get(entry.id);
        if (!card)
          return (
            <Unavailable
              key={entry.id}
              entry={entry}
              similarPath={load.similar[entry.id] ?? "/veiculos"}
            />
          );
        const drop = priceDrop(entry, card);
        return (
          <PublicCard
            key={entry.id}
            card={drop ? { ...card, badge: `Baixou ${brlShort(drop)}` } : card}
            cloudName={cloudName}
            showStore
          />
        );
      })}
    </ul>
  );
}

/**
 * Saiu da vitrine (vendido, despublicado ou loja fora do ar, BUY-FR-007): só o título
 * que o aparelho guardou e o selo, sem preço nem foto (BUY-SEC-002); "Ver veículos
 * parecidos" leva à página de descoberta do modelo.
 */
function Unavailable({
  entry,
  similarPath,
}: {
  entry: FavoriteEntry;
  similarPath: string;
}) {
  return (
    <li
      data-testid="favorite-unavailable"
      className="relative flex flex-col gap-2 rounded-card border border-line bg-surface p-4"
    >
      <FavoriteButton
        snapshot={entry}
        className="absolute top-2 right-2 text-ink"
      />
      <Badge tone="neutral">Vendido</Badge>
      <p className="pr-12 font-bold">{entry.title}</p>
      <Link
        href={similarPath}
        className="flex min-h-11 items-center text-sm font-semibold text-caju-deep underline"
      >
        Ver veículos parecidos
      </Link>
    </li>
  );
}
