"use client";

import { LoadMoreButton, useLoadMore } from "@/ui/load-more";
import { loadMoreVehiclesAction } from "../actions";
import type { VehicleCard as Card } from "../service";
import { VehicleCard, VehicleRow } from "./vehicle-card";

const idOf = (v: Card) => v.vehicleId;

/** Cards de Meus veículos [1c], de 20 em 20 (SHW-FR-007). */
export function VehicleList({
  initial,
  nextCursor,
  status,
  q,
  cloudName,
  sellOnPage = false,
}: {
  initial: Card[];
  nextCursor: string | null;
  status: string;
  q: string;
  cloudName: string;
  sellOnPage?: boolean;
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
  const key = (v: Card) => `${v.vehicleId}-${v.status}-${v.shareOnCajugo}`;
  return (
    <>
      {/* Celular [1c]: cards de gestão. */}
      <ul className="flex flex-col gap-3 lg:hidden">
        {list.items.map((v) => (
          <VehicleCard
            key={key(v)}
            v={v}
            cloudName={cloudName}
            sellOnPage={sellOnPage}
            onChanged={list.reload}
          />
        ))}
      </ul>
      {/* Desktop [15b]: tabela. */}
      <div className="hidden overflow-hidden rounded-card border border-line bg-surface lg:block">
        <table className="w-full border-collapse">
          <caption className="sr-only">Meus veículos</caption>
          <thead>
            <tr className="border-b border-line-2 text-left text-[11px] font-bold tracking-[0.04em] text-text-3 uppercase">
              <th scope="col" className="py-3 pr-3 pl-4">
                Veículo
              </th>
              <th scope="col" className="px-3">
                Ano · km
              </th>
              <th scope="col" className="px-3">
                Preço
              </th>
              <th scope="col" className="px-3">
                Situação
              </th>
              <th scope="col" className="px-3">
                Vitrine CajuGo
              </th>
              <th scope="col" className="pr-4 pl-3">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {list.items.map((v) => (
              <VehicleRow
                key={key(v)}
                v={v}
                cloudName={cloudName}
                sellOnPage={sellOnPage}
                onChanged={list.reload}
              />
            ))}
          </tbody>
        </table>
      </div>
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
