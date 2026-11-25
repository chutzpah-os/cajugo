import Link from "next/link";
import { brlWhole } from "@/platform/br/money";
import type { VehiclePage } from "../service";
import { CalendarIcon, CarIcon } from "@/ui/icons";
import { OpeningStatus } from "./opening-status";

type Live = Extract<VehiclePage, { kind: "vehicle" }>;

const monthYear = new Intl.DateTimeFormat("pt-BR", {
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});
const pct = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

/** Bloco branco da página do veículo (desktop: card; celular: faixa). */
export function Block({
  title,
  id,
  children,
}: {
  title?: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      aria-label={title}
      className="flex scroll-mt-20 flex-col gap-3 rounded-card border border-line bg-surface p-5 lg:p-8"
    >
      {title && <h2 className="text-[13px] text-text-3">{title}</h2>}
      {children}
    </section>
  );
}

/**
 * **Compare os preços** (015, PRC-FR-001): anunciado, média CajuGo dos iguais e Tabela
 * FIPE, com a diferença. Some sem FIPE e sem média.
 */
export function PriceCompare({ compare }: { compare: Live["priceCompare"] }) {
  const { priceCents, averageCents, fipe } = compare;
  if (priceCents === null || (!fipe && averageCents === null)) return null;
  const diff = fipe ? (priceCents - fipe.priceCents) / fipe.priceCents : null;
  return (
    <section
      aria-labelledby="compare-precos"
      data-testid="price-compare"
      className="flex flex-col gap-6 rounded-card bg-ink p-5 text-white lg:p-8"
    >
      <h2 id="compare-precos" className="text-[13px] text-on-dark-2">
        Compare os preços
      </h2>
      <dl className="grid gap-6 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <dt className="text-[13px] text-on-dark-2">Valor anunciado</dt>
          <dd className="text-[26px] font-extrabold tracking-[-0.02em]">
            {brlWhole(priceCents)}
          </dd>
        </div>
        {averageCents !== null && (
          <div className="flex flex-col gap-1">
            <dt className="text-[13px] font-bold text-castanha">CajuGo</dt>
            <dd className="text-[26px] font-extrabold tracking-[-0.02em]">
              {brlWhole(averageCents)}
            </dd>
            <dd className="text-xs text-on-dark-2">
              Valor médio de veículos iguais anunciados na CajuGo
            </dd>
          </div>
        )}
        {fipe && (
          <div className="flex flex-col gap-1">
            <dt className="text-[13px] font-bold text-white">Tabela FIPE</dt>
            <dd className="text-[26px] font-extrabold tracking-[-0.02em]">
              {brlWhole(fipe.priceCents)}
            </dd>
            <dd className="text-xs text-on-dark-2">
              Valor deste veículo na Tabela FIPE
              {fipe.month ? ` (${fipe.month})` : ""}
            </dd>
          </div>
        )}
      </dl>
      {diff !== null && Math.abs(diff) >= 0.001 && (
        <p className="text-sm text-on-dark-2" data-testid="fipe-diff">
          <strong className="text-white">
            {pct.format(Math.abs(diff) * 100)}% {diff < 0 ? "abaixo" : "acima"}
          </strong>{" "}
          da Tabela FIPE
        </p>
      )}
    </section>
  );
}

const FIELDS = [
  "Nome completo",
  "Data de nascimento",
  "E-mail",
  "CPF",
  "Celular",
  "Estado",
] as const;

/**
 * **Veja as parcelas desse veículo** (015, PRC-FR-004, PRC-SEC-001): os campos ficam
 * desabilitados e não há envio; o aviso explica que a integração com os bancos vem aí.
 */
export function FinancingNotice() {
  return (
    <section
      id="parcelas"
      aria-labelledby="parcelas-titulo"
      data-testid="financing"
      className="flex scroll-mt-20 flex-col gap-4 rounded-card border border-line bg-surface p-5 lg:p-8"
    >
      <div className="flex flex-col gap-1">
        <h2
          id="parcelas-titulo"
          className="text-[22px] font-extrabold tracking-[-0.01em]"
        >
          Veja as parcelas desse veículo
        </h2>
        <p className="text-sm text-text-2">
          Tudo sem compromisso, vamos começar com alguns dados :)
        </p>
      </div>
      <p
        role="note"
        className="rounded-input bg-warn-soft p-3 text-sm font-semibold text-warn"
      >
        No momento não estamos recebendo simulações: estamos fazendo a
        integração com os bancos para buscar as melhores condições para você.
      </p>
      <fieldset disabled className="grid gap-3 opacity-60 sm:grid-cols-2">
        <legend className="sr-only">
          Dados para a simulação (indisponível)
        </legend>
        {FIELDS.map((f) => (
          <label
            key={f}
            className="flex flex-col gap-1 text-[13px] font-semibold"
          >
            {f}
            <input
              disabled
              aria-disabled="true"
              className="h-12 rounded-input border border-field bg-bg px-3"
            />
          </label>
        ))}
      </fieldset>
      <button
        type="button"
        disabled
        className="flex h-12 items-center justify-center self-end rounded-button bg-caju px-8 text-[15px] font-bold text-white opacity-40 sm:w-60"
      >
        Ver parcelas
      </button>
    </section>
  );
}

/**
 * **Sobre a loja** (015, PRC-FR-007): nome, cidade, aberta agora (calculado no
 * navegador), as conquistas e o link para o estoque.
 */
export function StoreAbout({ store }: { store: Live["store"] }) {
  return (
    <Block title="Sobre a loja">
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-8">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-12 flex-none items-center justify-center rounded-[12px] bg-ink text-base font-extrabold text-white">
              {store.initials}
            </span>
            <div className="flex min-w-0 flex-col">
              <p className="truncate text-[17px] font-extrabold">
                {store.name}
              </p>
              <p className="text-sm text-text-2">
                {store.city}, {store.state}
              </p>
            </div>
          </div>
          <OpeningStatus hours={store.hours} />
          <Link
            href={`/loja/${store.slug}`}
            data-testid="store-link"
            className="flex min-h-11 items-center gap-1 text-[15px] font-extrabold text-ink"
          >
            Ver todos os veículos da loja <span aria-hidden>›</span>
          </Link>
        </div>
        <div className="flex flex-col gap-3 md:border-l md:border-line md:pl-8">
          <p className="text-[15px] font-bold">Conquistas</p>
          <ul className="grid grid-cols-2 gap-3 text-center text-[13px] text-text-2">
            {store.since && (
              <li className="flex flex-col gap-1 rounded-input bg-bg p-3">
                <CalendarIcon size={20} className="mx-auto text-caju" />
                <span>
                  Na CajuGo desde{" "}
                  <strong className="text-ink">
                    {monthYear.format(store.since)}
                  </strong>
                </span>
              </li>
            )}
            <li className="flex flex-col gap-1 rounded-input bg-bg p-3">
              <CarIcon size={20} className="mx-auto text-caju" />
              <span>
                <strong className="text-ink">{store.vehicleCount}</strong>{" "}
                {store.vehicleCount === 1
                  ? "veículo anunciado"
                  : "veículos anunciados"}
              </span>
            </li>
          </ul>
        </div>
      </div>
    </Block>
  );
}
