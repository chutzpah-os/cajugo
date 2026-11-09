"use client";

import { useRef, useState } from "react";
import { Chip } from "@/ui/chip";
import { activeFilters, type Filters } from "../filters";
import {
  FiltersForm,
  type FilterSection,
  type MakeOption,
} from "./filters-form";

const CLOSE_DRAG_PX = 60;

const CHIPS: {
  section: FilterSection;
  label: string;
  on: (f: Filters) => boolean;
}[] = [
  { section: "marca", label: "Marca", on: (f) => f.makes.length > 0 },
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
  store,
}: {
  filters: Filters;
  makes: MakeOption[];
  total: number;
  basePath: string;
  store: string | null;
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
        <Chip
          data-testid="filters-chip"
          aria-haspopup="dialog"
          active={active > 0}
          count={active || undefined}
          onClick={() => openAt()}
        >
          Filtros
        </Chip>
        {CHIPS.map((c) => (
          <Chip
            key={c.section}
            aria-haspopup="dialog"
            active={c.on(filters)}
            onClick={() => openAt(c.section)}
          >
            {c.label}
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
          store={store}
          idPrefix="filtro"
          layout="sheet"
          section={opening.section}
          onApply={close}
        />
      </dialog>
    </>
  );
}
