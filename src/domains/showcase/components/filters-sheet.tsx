"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { Button } from "@/ui/button";
import { Chip } from "@/ui/chip";
import { TextField } from "@/ui/text-field";
import { countMatchesAction } from "../actions";
import {
  activeFilters,
  filterHref,
  filtersToQuery,
  FUEL_OPTIONS,
  normalizeFilters,
  parseFilters,
  SORT_OPTIONS,
  TRANSMISSION_OPTIONS,
  type Filters,
} from "../filters";

export type MakeOption = { slug: string; name: string; count: number };

const COUNT_PAUSE_MS = 300;
const COLLAPSED_MAKES = 6;
const KM_MAX = 300_000;
const KM_STEP = 5_000;
const CLOSE_DRAG_PX = 60;

type Section = "marca" | "preco" | "ano" | "km" | "cambio";

const CHIPS: {
  section: Section;
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
  {
    section: "cambio",
    label: "Câmbio",
    on: (f) => f.transmissions.length > 0,
  },
];

const toggled = (list: string[], value: string) =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

const digits = (text: string) => text.replace(/\D/g, "");

function Group({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="flex flex-col gap-2">
      <h3 className="text-[15px] font-extrabold">{title}</h3>
      {children}
    </section>
  );
}

const chipRow = "flex flex-wrap gap-2";

/** Chips de [1a] e folha de filtros [6d] (SHW-FR-005). */
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
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState(filters);
  const [count, setCount] = useState<number | null>(total);
  const [allMakes, setAllMakes] = useState(false);
  const [makeSearch, setMakeSearch] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const latest = useRef(0);
  const dragStart = useRef<number | null>(null);

  function openAt(section?: Section) {
    clearTimeout(timer.current);
    latest.current += 1;
    setDraft(filters);
    setCount(total);
    setAllMakes(false);
    setMakeSearch("");
    dialog.current?.showModal();
    if (section)
      document
        .getElementById(`filtro-${section}`)
        ?.scrollIntoView({ block: "start" });
  }

  /** Conta depois da pausa; resposta de um estado antigo é descartada. */
  function update(next: Filters) {
    setDraft(next);
    setCount(null);
    clearTimeout(timer.current);
    const request = ++latest.current;
    timer.current = setTimeout(async () => {
      const n = await countMatchesAction({
        store,
        query: filtersToQuery(normalizeFilters(next)),
      });
      if (request === latest.current) setCount(n);
    }, COUNT_PAUSE_MS);
  }

  function apply() {
    clearTimeout(timer.current);
    latest.current += 1;
    dialog.current?.close();
    router.push(filterHref(basePath, normalizeFilters(draft)));
  }

  const active = activeFilters(filters);
  const ranked = [...makes].sort((a, b) => b.count - a.count);
  const needle = makeSearch.trim().toLowerCase();
  const visibleMakes = allMakes
    ? makes.filter((m) => m.name.toLowerCase().includes(needle))
    : makes.filter(
        (m) =>
          draft.makes.includes(m.slug) ||
          ranked.slice(0, COLLAPSED_MAKES).includes(m),
      );
  const km = Math.min(draft.kmTo ?? KM_MAX, KM_MAX);

  return (
    <>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4">
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
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
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
              dialog.current?.close();
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
            onClick={() => dialog.current?.close()}
            className="flex h-11 items-center px-2 text-sm font-semibold text-text-2"
          >
            Fechar
          </button>
        </div>
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 py-3">
          <Group title="Ordenar por">
            <div className={chipRow}>
              {SORT_OPTIONS.map((o) => (
                <Chip
                  key={o.value}
                  active={draft.sort === o.value}
                  onClick={() => update({ ...draft, sort: o.value })}
                >
                  {o.label}
                </Chip>
              ))}
            </div>
          </Group>
          <Group id="filtro-marca" title="Marca">
            {allMakes && (
              <TextField
                id="filter-make-search"
                label="Buscar marca"
                value={makeSearch}
                onChange={(e) => setMakeSearch(e.target.value)}
              />
            )}
            <div className={chipRow}>
              {visibleMakes.map((m) => (
                <Chip
                  key={m.slug}
                  active={draft.makes.includes(m.slug)}
                  onClick={() =>
                    update({ ...draft, makes: toggled(draft.makes, m.slug) })
                  }
                >
                  {m.name}
                </Chip>
              ))}
            </div>
            {!allMakes && makes.length > COLLAPSED_MAKES && (
              <button
                type="button"
                onClick={() => setAllMakes(true)}
                className="flex h-11 items-center self-start text-sm font-semibold text-caju-deep"
              >
                Ver todas
              </button>
            )}
          </Group>
          <Group id="filtro-preco" title="Preço">
            <div className="grid grid-cols-2 gap-2">
              <TextField
                id="filter-price-from"
                label="De"
                prefix="R$"
                inputMode="numeric"
                value={
                  draft.priceFrom === undefined ? "" : draft.priceFrom / 100
                }
                onChange={(e) => {
                  const v = digits(e.target.value);
                  update({
                    ...draft,
                    priceFrom: v ? Number(v) * 100 : undefined,
                  });
                }}
              />
              <TextField
                id="filter-price-to"
                label="Até"
                prefix="R$"
                inputMode="numeric"
                value={draft.priceTo === undefined ? "" : draft.priceTo / 100}
                onChange={(e) => {
                  const v = digits(e.target.value);
                  update({
                    ...draft,
                    priceTo: v ? Number(v) * 100 : undefined,
                  });
                }}
              />
            </div>
          </Group>
          <Group id="filtro-ano" title="Ano">
            <div className="grid grid-cols-2 gap-2">
              <TextField
                id="filter-year-from"
                label="De"
                inputMode="numeric"
                maxLength={4}
                value={draft.yearFrom ?? ""}
                onChange={(e) => {
                  const v = digits(e.target.value);
                  update({ ...draft, yearFrom: v ? Number(v) : undefined });
                }}
              />
              <TextField
                id="filter-year-to"
                label="Até"
                inputMode="numeric"
                maxLength={4}
                value={draft.yearTo ?? ""}
                onChange={(e) => {
                  const v = digits(e.target.value);
                  update({ ...draft, yearTo: v ? Number(v) : undefined });
                }}
              />
            </div>
          </Group>
          <Group id="filtro-km" title="Quilometragem">
            <label className="flex flex-col gap-1 text-sm text-text-2">
              {draft.kmTo === undefined
                ? "Qualquer quilometragem"
                : `Até ${km.toLocaleString("pt-BR")} km`}
              <input
                type="range"
                aria-label="Quilometragem máxima"
                min={KM_STEP}
                max={KM_MAX}
                step={KM_STEP}
                value={km}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  update({ ...draft, kmTo: v >= KM_MAX ? undefined : v });
                }}
                className="h-11 w-full accent-caju"
              />
            </label>
          </Group>
          <Group id="filtro-cambio" title="Câmbio">
            <div className={chipRow}>
              {TRANSMISSION_OPTIONS.map((o) => (
                <Chip
                  key={o.value}
                  active={draft.transmissions.includes(o.value)}
                  onClick={() =>
                    update({
                      ...draft,
                      transmissions: toggled(draft.transmissions, o.value),
                    })
                  }
                >
                  {o.label}
                </Chip>
              ))}
            </div>
          </Group>
          <Group title="Combustível">
            <div className={chipRow}>
              {FUEL_OPTIONS.map((o) => (
                <Chip
                  key={o.value}
                  active={draft.fuels.includes(o.value)}
                  onClick={() =>
                    update({ ...draft, fuels: toggled(draft.fuels, o.value) })
                  }
                >
                  {o.label}
                </Chip>
              ))}
            </div>
          </Group>
        </div>
        <div className="grid shrink-0 grid-cols-[auto_1fr] gap-2 border-t border-line p-4">
          <Button
            variant="ghost"
            onClick={() =>
              update({
                ...parseFilters({}),
                ...(draft.q ? { q: draft.q } : {}),
              })
            }
          >
            Limpar
          </Button>
          <Button data-testid="filters-apply" onClick={apply}>
            {count === null
              ? "Ver veículos"
              : `Ver ${count} ${count === 1 ? "veículo" : "veículos"}`}
          </Button>
        </div>
      </dialog>
    </>
  );
}
