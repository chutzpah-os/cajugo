"use client";

import { LoadMoreButton, useLoadMore } from "@/ui/load-more";
import { loadMoreVehiclesAction } from "../actions";
import type { VehicleCard as Card } from "../service";
import { VehicleCard } from "./vehicle-card";

const idOf = (v: Card) => v.vehicleId;

/** Cards de Meus veículos [1c], de 20 em 20 (SHW-FR-007). */
export function VehicleList({
  initial,
  nextCursor,
  status,
  q,
  cloudName,
}: {
  initial: Card[];
  nextCursor: string | null;
  status: string;
  q: string;
  cloudName: string;
}) {
  const list = useLoadMore<Card>({
    initial,
    nextCursor,
    idOf,
    fetchPage: async (cursor) => {
      const r = await loadMoreVehiclesAction({ status, q, cursor });
      return r.ok ? { items: r.items, nextCursor: r.nextCursor } : null;
    },
  });
  return (
    <>
      <ul className="flex flex-col gap-3">
        {list.items.map((v) => (
          <VehicleCard
            key={`${v.vehicleId}-${v.status}-${v.shareOnCajugo}`}
            v={v}
            cloudName={cloudName}
            onChanged={list.reload}
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
    </>
  );
}
