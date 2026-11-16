import Link from "next/link";
import { brl } from "@/platform/br/money";
import { relativeTime } from "@/platform/br/relative-time";
import { Badge, type BadgeTone } from "@/ui/badge";
import { cn } from "@/ui/cn";
import { EmptyState } from "@/ui/empty-state";
import type { LeadCard, LeadFilter, LeadsBoard } from "../service";
import {
  FILTER_LABEL,
  LEAD_FILTERS,
  ORIGIN_LABEL,
  STATUS_LABEL,
  type LeadStatus,
} from "../status";
import { LeadActions } from "./lead-actions";

const STATUS_TONE: Record<LeadStatus, BadgeTone> = {
  new: "caju",
  contacting: "info",
  negotiating: "warn",
  sold: "ok",
  lost: "neutral",
};

const filterHref = (f: LeadFilter) =>
  f === "all" ? "/painel/leads" : `/painel/leads?status=${f}`;

function LeadCardItem({ lead, now }: { lead: LeadCard; now: Date }) {
  const viaWhatsapp = lead.channel === "whatsapp";
  const vehicle = (
    <>
      {lead.vehicle.title}
      {lead.vehicle.deleted
        ? " · Veículo excluído"
        : lead.vehicle.priceCents !== null &&
          ` · ${brl(lead.vehicle.priceCents)}`}
    </>
  );
  return (
    <li
      data-testid="lead-card"
      data-highlight={lead.highlight || undefined}
      className={cn(
        "flex flex-col gap-3 rounded-card border bg-surface p-3",
        lead.highlight ? "border-[1.5px] border-caju" : "border-line",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-neutral-soft text-sm font-extrabold"
        >
          {lead.initials ?? "WA"}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="flex items-baseline justify-between gap-2">
            <strong className="truncate">
              {viaWhatsapp ? "Contato pelo WhatsApp" : (lead.name ?? "Contato")}
            </strong>
            <span className="shrink-0 text-xs text-text-3">
              {relativeTime(lead.createdAt, now)}
            </span>
          </p>
          {lead.vehicle.deleted ? (
            <p className="text-sm text-text-2">{vehicle}</p>
          ) : (
            <Link
              href={`/painel/veiculos/${lead.vehicle.id}`}
              className="flex min-h-11 items-center text-sm text-text-2 underline"
            >
              {vehicle}
            </Link>
          )}
          <div className="mt-1 flex flex-wrap gap-1.5">
            <Badge tone={STATUS_TONE[lead.status]}>
              {STATUS_LABEL[lead.status]}
            </Badge>
            <Badge tone="neutral">
              {lead.origin === "seller" && lead.sellerName
                ? `${ORIGIN_LABEL.seller} ${lead.sellerName}`
                : ORIGIN_LABEL[lead.origin]}
            </Badge>
          </div>
        </div>
      </div>
      {lead.highlight && (
        <p className="text-xs font-semibold text-caju-deep">
          Sem resposta há mais de 24 horas
        </p>
      )}
      {lead.message && (
        <p className="text-sm whitespace-pre-line text-text-2">
          {lead.message}
        </p>
      )}
      {(lead.whatsappUrl || lead.telUrl) && (
        <div className="grid grid-cols-2 gap-2">
          {lead.whatsappUrl && (
            <a
              href={lead.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-11 items-center justify-center rounded-button bg-whatsapp text-sm font-bold text-white"
            >
              WhatsApp
            </a>
          )}
          {lead.telUrl && (
            <a
              href={lead.telUrl}
              className="flex h-11 items-center justify-center rounded-button border-[1.5px] border-ink text-sm font-bold"
            >
              Ligar
            </a>
          )}
        </div>
      )}
      <LeadActions leadId={lead.id} status={lead.status} />
    </li>
  );
}

/** Tela Leads [3a] (LED-FR-005 a 010, 014). */
export function LeadsBoardView({
  board,
  filter,
  now,
}: {
  board: LeadsBoard;
  filter: LeadFilter;
  now: Date;
}) {
  return (
    <section className="flex flex-col gap-4 py-6 pb-24">
      <h1 className="text-[22px] font-extrabold">Leads</h1>
      <div className="grid grid-cols-2 gap-2 rounded-card bg-ink p-3 text-white">
        <div className="flex flex-col">
          <span
            className="text-[22px] font-extrabold"
            data-testid="kpi-new-leads"
          >
            {board.newCount}
          </span>
          <span className="text-xs text-on-dark-2">Novos, sem resposta</span>
        </div>
        <div className="flex flex-col">
          <span
            className="text-[22px] font-extrabold"
            data-testid="kpi-cajugo-share"
          >
            {board.cajugoShare === null ? "–" : `${board.cajugoShare}%`}
          </span>
          <span className="text-xs text-on-dark-2">
            vieram da vitrine CajuGo (30 dias)
          </span>
        </div>
      </div>

      <nav aria-label="Filtrar leads" className="flex gap-2 overflow-x-auto">
        {LEAD_FILTERS.map((key) => (
          <Link
            key={key}
            href={filterHref(key)}
            aria-current={filter === key ? "page" : undefined}
            className="flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-field bg-surface px-3.5 text-sm font-semibold aria-[current=page]:border-ink aria-[current=page]:bg-ink aria-[current=page]:text-white"
          >
            {FILTER_LABEL[key]}{" "}
            <span className="opacity-60">{board.counts[key]}</span>
          </Link>
        ))}
      </nav>

      {board.cards.length ? (
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {board.cards.map((lead) => (
            <LeadCardItem key={lead.id} lead={lead} now={now} />
          ))}
        </ul>
      ) : filter !== "all" ? (
        <p className="rounded-card border border-line bg-surface p-4 text-sm text-text-2">
          Nenhum lead com este status.
        </p>
      ) : (
        <EmptyState icon="💬" title="Nenhum lead ainda">
          Quando alguém mandar mensagem ou tocar no WhatsApp de um veículo seu,
          o contato aparece aqui.
        </EmptyState>
      )}
    </section>
  );
}
