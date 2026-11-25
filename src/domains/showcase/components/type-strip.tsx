import Link from "next/link";
import { filterHref, type Condition, type Filters } from "../filters";
import { typeImage, VEHICLE_TYPES, vehicleType } from "../vehicle-types";
import { cn } from "@/ui/cn";
import { ScrollRow } from "@/ui/scroll-row";

/**
 * Faixa de tipos (014, TIP-FR-007): um cartão por tipo, com a ilustração e o nome,
 * rolando na horizontal. Ocupa o lugar da barra de filtros até escolher o tipo;
 * tocar filtra pelo tipo (a busca e os outros filtros ficam).
 */
export function TypeStrip({
  filters,
  basePath,
}: {
  filters: Filters;
  basePath: string;
}) {
  return (
    <nav aria-label="Tipos de veículo" className="-mx-4 md:mx-0">
      <ScrollRow label="Tipos de veículo">
        <ul className="flex snap-x scroll-px-4 gap-2.5 px-4 md:scroll-px-0 md:px-0">
          {VEHICLE_TYPES.map((t) => (
            <li key={t.slug} className="flex-none snap-start">
              <Link
                href={filterHref(basePath, { ...filters, type: t.slug })}
                data-testid={`type-${t.slug}`}
                className="flex h-[118px] w-[124px] flex-col items-center justify-between rounded-card bg-caju-tint px-2 pt-2.5 pb-2.5 text-center ring-caju-soft transition hover:ring-2 lg:h-[132px] lg:w-[148px]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- ilustração estática pequena (WebP de ~9 KB) */}
                <img
                  src={typeImage(t.slug)}
                  alt=""
                  width={120}
                  height={80}
                  className="h-[66px] w-auto lg:h-[76px]"
                />
                <span className="text-[13px] leading-tight font-bold text-caju-deep">
                  {t.label}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </ScrollRow>
    </nav>
  );
}

/** Chip **Tipo** da barra, com o tipo escolhido: tocar tira o tipo e a faixa volta. */
export function TypeChip({
  filters,
  basePath,
  className,
}: {
  filters: Filters;
  basePath: string;
  className?: string;
}) {
  if (!filters.type) return null;
  const t = vehicleType(filters.type);
  return (
    <Link
      href={filterHref(basePath, { ...filters, type: undefined })}
      aria-label={`Tipo: ${t.label}. Tocar para trocar o tipo`}
      data-testid="type-chip"
      className={cn("flex h-11 flex-none items-center", className)}
    >
      <span className="flex h-[34px] items-center gap-1.5 rounded-full bg-ink pr-3 pl-1.5 text-[13px] font-semibold text-white">
        {/* eslint-disable-next-line @next/next/no-img-element -- ilustração estática pequena */}
        <img
          src={typeImage(t.slug)}
          alt=""
          width={36}
          height={24}
          className="h-6 w-9 rounded-full bg-caju-tint object-contain"
        />
        {t.label}
        <span aria-hidden>✕</span>
      </span>
    </Link>
  );
}

/** Seção **Tipo de veículo** no topo do filtro lateral do desktop (TIP-FR-007). */
export function TypeList({
  filters,
  basePath,
  id = "tipo-lateral",
}: {
  filters: Filters;
  basePath: string;
  /** Lateral e folha estão na mesma página: cada uma com o seu id. */
  id?: string;
}) {
  return (
    <nav aria-labelledby={id} className="flex flex-col gap-1">
      <h3 id={id} className="text-[15px] font-extrabold">
        Tipo de veículo
      </h3>
      {!filters.type && (
        <p className="text-[13px] text-text-3">Comece pelo tipo de veículo.</p>
      )}
      <ul className="flex max-h-[228px] flex-col overflow-y-auto overscroll-contain pr-1">
        {VEHICLE_TYPES.map((t) => {
          const on = filters.type === t.slug;
          return (
            <li key={t.slug}>
              <Link
                href={filterHref(basePath, {
                  ...filters,
                  type: on ? undefined : t.slug,
                })}
                aria-current={on ? "true" : undefined}
                className="flex min-h-11 items-center gap-2.5 rounded-input px-1 text-sm text-text-2 hover:bg-bg aria-[current=true]:font-bold aria-[current=true]:text-ink"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- ilustração estática pequena */}
                <img
                  src={typeImage(t.slug)}
                  alt=""
                  width={42}
                  height={28}
                  className="h-7 w-[42px] object-contain"
                />
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Seção **Condição** logo depois do tipo: novo (0 km) ou usado (017). */
export function ConditionList({
  filters,
  basePath,
  id = "condicao-lateral",
}: {
  filters: Filters;
  basePath: string;
  id?: string;
}) {
  return (
    <nav aria-labelledby={id} className="flex flex-col gap-1">
      <h3 id={id} className="text-[15px] font-extrabold">
        Condição
      </h3>
      <ul className="flex flex-col">
        {(Object.keys(CONDITION_LABEL) as Condition[]).map((c) => {
          const on = filters.condition === c;
          return (
            <li key={c}>
              <Link
                href={filterHref(basePath, {
                  ...filters,
                  condition: on ? undefined : c,
                })}
                aria-current={on ? "true" : undefined}
                className="flex min-h-11 items-center gap-2.5 rounded-input px-1 text-sm text-text-2 hover:bg-bg aria-[current=true]:font-bold aria-[current=true]:text-ink"
              >
                <span
                  aria-hidden
                  className="flex size-5 flex-none items-center justify-center rounded-full border border-field group-aria-[current=true]:border-ink"
                >
                  {on && <span className="size-2.5 rounded-full bg-ink" />}
                </span>
                {CONDITION_LABEL[c]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

const CONDITION_LABEL: Record<Condition, string> = {
  novo: "Novo",
  usado: "Usado",
};
