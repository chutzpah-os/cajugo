"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/ui/button";
import { Chip } from "@/ui/chip";
import { TextField } from "@/ui/text-field";
import { countMatchesAction } from "../actions";
import {
  filterHref,
  filtersToQuery,
  FUEL_OPTIONS,
  normalizeFilters,
  parseFilters,
  SORT_OPTIONS,
  TRANSMISSION_OPTIONS,
  type Filters,
} from "../filters";
import { useCatalogNavigation } from "./catalog-navigation";
import type { ListSource } from "../list-source";

export type MakeOption = { slug: string; name: string; count: number };
export type FilterSection = "marca" | "preco" | "ano" | "km" | "cambio";

const COUNT_PAUSE_MS = 300;
const COLLAPSED_MAKES = 6;
const KM_MAX = 300_000;
const KM_STEP = 5_000;

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

const LAYOUT = {
  sheet: {
    scroll: "flex flex-1 flex-col gap-5 overflow-y-auto px-4 py-3",
    footer: "grid shrink-0 grid-cols-[auto_1fr] gap-2 border-t border-line p-4",
  },
  side: {
    scroll: "flex flex-col gap-5",
    footer: "mt-4 grid grid-cols-[auto_1fr] gap-2",
  },
};

/** Campos de [6d] com a contagem ao vivo: na folha (celular) e na lateral [15a]. */
export function FiltersForm({
  filters,
  makes,
  total,
  basePath,
  source,
  idPrefix,
  layout,
  section,
  showSort = true,
  onApply,
}: {
  filters: Filters;
  makes: MakeOption[];
  total: number;
  basePath: string;
  source: ListSource;
  idPrefix: string;
  layout: keyof typeof LAYOUT;
  section?: FilterSection;
  showSort?: boolean;
  onApply?: () => void;
}) {
  const { navigate } = useCatalogNavigation();
  const [draft, setDraft] = useState(filters);
  const [count, setCount] = useState<number | null>(total);
  const [allMakes, setAllMakes] = useState(false);
  const [makeSearch, setMakeSearch] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const latest = useRef(0);
  const scrollClass = LAYOUT[layout].scroll;
  const footerClass = LAYOUT[layout].footer;

  useEffect(() => {
    if (section)
      document
        .getElementById(`${idPrefix}-${section}`)
        ?.scrollIntoView({ block: "start" });
  }, [idPrefix, section]);
  useEffect(() => () => clearTimeout(timer.current), []);

  /** Conta depois da pausa; resposta de um estado antigo é descartada. */
  function update(next: Filters) {
    setDraft(next);
    setCount(null);
    clearTimeout(timer.current);
    const request = ++latest.current;
    timer.current = setTimeout(async () => {
      const n = await countMatchesAction({
        source,
        query: filtersToQuery(normalizeFilters(next)),
      });
      if (request === latest.current) setCount(n);
    }, COUNT_PAUSE_MS);
  }

  function apply() {
    clearTimeout(timer.current);
    latest.current += 1;
    onApply?.();
    navigate(filterHref(basePath, normalizeFilters(draft)));
  }

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
      <div className={scrollClass}>
        {showSort && (
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
        )}
        <Group id={`${idPrefix}-marca`} title="Marca">
          {allMakes && (
            <TextField
              id={`${idPrefix}-make-search`}
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
        <Group id={`${idPrefix}-preco`} title="Preço">
          <div className="grid grid-cols-2 gap-2">
            <TextField
              id={`${idPrefix}-price-from`}
              label="De"
              prefix="R$"
              inputMode="numeric"
              value={draft.priceFrom === undefined ? "" : draft.priceFrom / 100}
              onChange={(e) => {
                const v = digits(e.target.value);
                update({
                  ...draft,
                  priceFrom: v ? Number(v) * 100 : undefined,
                });
              }}
            />
            <TextField
              id={`${idPrefix}-price-to`}
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
        <Group id={`${idPrefix}-ano`} title="Ano">
          <div className="grid grid-cols-2 gap-2">
            <TextField
              id={`${idPrefix}-year-from`}
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
              id={`${idPrefix}-year-to`}
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
        <Group id={`${idPrefix}-km`} title="Quilometragem">
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
        <Group id={`${idPrefix}-cambio`} title="Câmbio">
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
      <div className={footerClass}>
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
    </>
  );
}
