"use client";

import { useRef, useState, type ReactNode } from "react";
import { Chip } from "@/ui/chip";
import { ChevronDownIcon, FilterIcon } from "@/ui/icons";
import { activeFilters, type Filters } from "../filters";
import {
  FiltersForm,
  type FilterSection,
  type MakeOption,
} from "./filters-form";
import type { ListSource } from "../list-source";

const CLOSE_DRAG_PX = 60;

const CHIPS: {
  section: FilterSection;
  label: string;
  on: (f: Filters) => boolean;
}[] = [
  { section: "marca", label: "Marca", on: (f) => f.makes.length > 0 },
  {
    section: "cidade",
    label: "Cidade",
    on: (f) => (f.cities?.length ?? 0) > 0,
  },
  {
    section: "preco",
    label: "Preço",
    on: (f) => f.priceFrom !== undefined || f.priceTo !== undefined,
  },
  {
    section: "ano",
    label: "Ano",
    on: (f) => f.yearFrom !== undefined || f.yearTo !== undefined,
  },
  { section: "km", label: "Km", on: (f) => f.kmTo !== undefined },
  { section: "cambio", label: "Câmbio", on: (f) => f.transmissions.length > 0 },
];

/** Chips de [1a] e folha de filtros [6d] (SHW-FR-005); no desktop vale a lateral. */
export function FiltersSheet({
  filters,
  makes,
  total,
  basePath,
  source,
  lockMake = false,
  cities,
  lead,
  top,
}: {
  /** Seção do topo da folha (Tipo de veículo, 014). */
  top?: ReactNode;
  /** Chip antes dos filtros (o Tipo escolhido na vitrine, 014). */
  lead?: ReactNode;
  filters: Filters;
  makes: MakeOption[];
  total: number;
  basePath: string;
  source: ListSource;
  lockMake?: boolean;
  cities?: MakeOption[];
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const dragStart = useRef<number | null>(null);
  const [opening, setOpening] = useState<{
    n: number;
    section?: FilterSection;
  }>({ n: 0 });
  const close = () => dialog.current?.close();

  function openAt(section?: FilterSection) {
    // Nova chave: o formulário volta a refletir os filtros da página.
    setOpening((o) => ({ n: o.n + 1, section }));
    dialog.current?.showModal();
  }

  const active = activeFilters(filters);

  return (
    <>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 lg:hidden">
        <button
          type="button"
          data-testid="filters-chip"
          aria-haspopup="dialog"
          aria-pressed={active > 0}
          onClick={() => openAt()}
          className="inline-flex h-11 shrink-0 items-center"
        >
          <span className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-3.5 text-sm font-semibold text-white">
            <FilterIcon size={15} />
            Filtros
            {active > 0 && (
              <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-caju px-1 text-[11px]">
                {active}
              </span>
            )}
          </span>
        </button>
        {lead}
        {CHIPS.filter(
          (c) =>
            !(lockMake && c.section === "marca") &&
            !(c.section === "cidade" && (cities?.length ?? 0) < 2),
        ).map((c) => (
          <Chip
            key={c.section}
            aria-haspopup="dialog"
            active={c.on(filters)}
            onClick={() => openAt(c.section)}
          >
            {c.label}
            <ChevronDownIcon size={14} />
          </Chip>
        ))}
      </div>
      <dialog
        ref={dialog}
        aria-labelledby="filters-title"
        data-testid="filters-sheet"
        onClick={(e) => e.target === e.currentTarget && close()}
        className="m-0 mt-24 h-[calc(100dvh-96px)] max-h-none w-full max-w-none flex-col rounded-t-[20px] bg-surface backdrop:bg-[rgba(28,27,32,.55)] open:flex md:m-auto md:h-[85dvh] md:max-w-lg md:rounded-card"
      >
        <div
          aria-hidden
          className="flex h-6 shrink-0 touch-none items-center justify-center"
          onPointerDown={(e) => {
            dragStart.current = e.clientY;
          }}
          onPointerUp={(e) => {
            if (
              dragStart.current !== null &&
              e.clientY - dragStart.current > CLOSE_DRAG_PX
            )
              close();
            dragStart.current = null;
          }}
        >
          <span className="h-1 w-10 rounded-full bg-field" />
        </div>
        <div className="flex shrink-0 items-center justify-between px-4">
          <h2 id="filters-title" className="text-[19px] font-extrabold">
            Filtros
          </h2>
          <button
            type="button"
            onClick={close}
            className="flex h-11 items-center px-2 text-sm font-semibold text-text-2"
          >
            Fechar
          </button>
        </div>
        <FiltersForm
          key={opening.n}
          filters={filters}
          makes={makes}
          total={total}
          basePath={basePath}
          source={source}
          lockMake={lockMake}
          cities={cities}
          idPrefix="filtro"
          layout="sheet"
          section={opening.section}
          onApply={close}
          top={top}
        />
      </dialog>
    </>
  );
}
