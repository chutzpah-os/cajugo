"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/ui/cn";

const TABS = [
  ["buscar", "Buscar"],
  ["vender", "Vender"],
] as const;

/**
 * Quadro do topo da vitrine (014, TIP-FR-020): **Buscar** (aberta ao chegar) com a
 * busca e a faixa de tipos ou a barra de filtros; **Vender** com a chamada para a
 * página do lojista. Sem JavaScript, fica a aba Buscar.
 */
export function ShowcasePanel({
  search,
  sell,
}: {
  search: ReactNode;
  sell: ReactNode;
}) {
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("buscar");
  return (
    <section
      aria-label="Buscar ou vender"
      className="-mx-4 flex flex-col lg:mx-auto lg:w-full lg:max-w-5xl"
      data-testid="showcase-panel"
    >
      <div role="tablist" className="flex px-4 lg:px-0">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            id={`tab-${key}`}
            aria-selected={tab === key}
            aria-controls={`painel-${key}`}
            onClick={() => setTab(key)}
            className={cn(
              "flex h-11 min-w-[112px] items-center justify-center rounded-t-[12px] px-5 text-[13px] font-extrabold tracking-[0.06em] uppercase",
              tab === key ? "bg-surface text-ink" : "bg-line-2 text-text-3",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`painel-${tab}`}
        aria-labelledby={`tab-${tab}`}
        className="flex flex-col gap-3 bg-surface px-4 py-4 lg:max-w-5xl lg:rounded-b-card lg:rounded-tr-card lg:border lg:border-line lg:p-4"
      >
        {tab === "buscar" ? search : sell}
      </div>
    </section>
  );
}
