"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/ui/button";
import { CheckTree, type CheckNode } from "@/ui/check-tree";
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

export type MakeOption = {
  slug: string;
  name: string;
  count: number;
  /** Subtipos: modelos da marca ou cidades do estado (012). */
  children?: MakeOption[];
};
export type FilterSection =
  "marca" | "cidade" | "preco" | "ano" | "km" | "cambio";

const COUNT_PAUSE_MS = 300;
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

const chipRow = "flex flex-wrap gap-x-2 gap-y-0";

const LAYOUT = {
  sheet: {
    scroll: "flex flex-1 flex-col gap-5 overflow-y-auto px-4 py-3",
    list: "",
    footer: "grid shrink-0 grid-cols-[auto_1fr] gap-2 border-t border-line p-4",
  },
  side: {
    scroll: "flex flex-col gap-4",
    /** Lateral: uns 5 itens à vista; o resto rola dentro da seção (pedido do dono). */
    list: "max-h-[228px] overflow-y-auto overscroll-contain pr-1",
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
  lockMake = false,
  cities = [],
  onApply,
  top,
}: {
  /** Seção antes das outras (Tipo de veículo na vitrine, 014). */
  top?: ReactNode;
  filters: Filters;
  makes: MakeOption[];
  total: number;
  basePath: string;
  source: ListSource;
  idPrefix: string;
  layout: keyof typeof LAYOUT;
  section?: FilterSection;
  showSort?: boolean;
  /** Página com marca fixa (descoberta): sem a seção Marca. */
  lockMake?: boolean;
  /** Cidades da vitrine (012): filtro na própria tela, como a Marca. */
  cities?: MakeOption[];
  onApply?: () => void;
}) {
  const { navigate } = useCatalogNavigation();
  const [draft, setDraft] = useState(filters);
  const [count, setCount] = useState<number | null>(total);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const latest = useRef(0);
  const scrollClass = LAYOUT[layout].scroll;
  const listClass = LAYOUT[layout].list;
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
    navigate?.(filterHref(basePath, normalizeFilters(draft)));
  }

  const km = Math.min(draft.kmTo ?? KM_MAX, KM_MAX);
  const chipSize = layout === "side" ? "sm" : "md";
  const makeNodes: CheckNode[] = makes.map((m) => ({
    value: m.slug,
    label: m.name,
    count: m.count,
    children: m.children?.map((c) => ({
      value: c.slug,
      label: c.name,
      count: c.count,
    })),
  }));
  const stateNodes: CheckNode[] = cities.map((st) => ({
    value: `uf:${st.slug}`,
    label: st.name,
    count: st.count,
    children: st.children?.map((c) => ({
      value: c.slug,
      label: c.name,
      count: c.count,
    })),
  }));
  const kids = (n: CheckNode) => (n.children ?? []).map((c) => c.value);
  const models = draft.models ?? [];
  const chosenCities = draft.cities ?? [];

  /** Marca: marcada vale para todos os modelos; sem modelos, sai tudo. */
  function toggleMake(n: CheckNode) {
    const on =
      draft.makes.includes(n.value) || kids(n).some((k) => models.includes(k));
    update({
      ...draft,
      makes: on
        ? draft.makes.filter((x) => x !== n.value)
        : [...draft.makes, n.value],
      models: models.filter((m) => !kids(n).includes(m)),
    });
  }
  /** Modelo: desmarcar um da marca inteira deixa os outros; todos = a marca. */
  function toggleModel(n: CheckNode, c: CheckNode) {
    const whole = draft.makes.includes(n.value);
    let next = whole
      ? kids(n).filter((k) => k !== c.value)
      : toggled(
          models.filter((m) => kids(n).includes(m)),
          c.value,
        );
    let makesNext = draft.makes.filter((x) => x !== n.value);
    if (next.length === kids(n).length) {
      makesNext = [...makesNext, n.value];
      next = [];
    }
    update({
      ...draft,
      makes: makesNext,
      models: [...models.filter((m) => !kids(n).includes(m)), ...next],
    });
  }
  /** Estado: marca ou desmarca todas as cidades dele. */
  function toggleState(n: CheckNode) {
    const all = kids(n).every((k) => chosenCities.includes(k));
    update({
      ...draft,
      cities: all
        ? chosenCities.filter((c) => !kids(n).includes(c))
        : [...new Set([...chosenCities, ...kids(n)])],
    });
  }

  return (
    <>
      <div className={scrollClass}>
        {top}
        {showSort && (
          <Group title="Ordenar por">
            <div className={chipRow}>
              {SORT_OPTIONS.map((o) => (
                <Chip
                  size={chipSize}
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
        {!lockMake && (
          <Group id={`${idPrefix}-marca`} title="Marca e modelo">
            <div className={listClass}>
              <CheckTree
                label="Marca e modelo"
                nodes={makeNodes}
                isOn={(v) => draft.makes.includes(v) || models.includes(v)}
                onToggleParent={toggleMake}
                onToggleChild={toggleModel}
              />
            </div>
          </Group>
        )}
        {stateNodes.length > 0 && (
          <Group id={`${idPrefix}-cidade`} title="Estado e cidade">
            <div className={listClass}>
              <CheckTree
                label="Estado e cidade"
                nodes={stateNodes}
                isOn={(v) => chosenCities.includes(v)}
                onToggleParent={toggleState}
                onToggleChild={(_, c) =>
                  update({ ...draft, cities: toggled(chosenCities, c.value) })
                }
              />
            </div>
          </Group>
        )}
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
          <CheckTree
            label="Câmbio"
            nodes={TRANSMISSION_OPTIONS.map((o) => ({
              value: o.value,
              label: o.label,
            }))}
            isOn={(v) => draft.transmissions.includes(v)}
            onToggleParent={(n) =>
              update({
                ...draft,
                transmissions: toggled(draft.transmissions, n.value),
              })
            }
            onToggleChild={() => {}}
          />
        </Group>
        <Group title="Combustível">
          <CheckTree
            label="Combustível"
            nodes={FUEL_OPTIONS.map((o) => ({
              value: o.value,
              label: o.label,
            }))}
            isOn={(v) => draft.fuels.includes(v)}
            onToggleParent={(n) =>
              update({ ...draft, fuels: toggled(draft.fuels, n.value) })
            }
            onToggleChild={() => {}}
          />
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
