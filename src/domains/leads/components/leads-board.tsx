import Link from "next/link";
import { brlWhole } from "@/platform/br/money";
import { relativeTime } from "@/platform/br/relative-time";
import { Badge, type BadgeTone } from "@/ui/badge";
import { cn } from "@/ui/cn";
import { EmptyState } from "@/ui/empty-state";
import { PhoneIcon, WhatsAppIcon } from "@/ui/icons";
import { Kpi } from "@/ui/kpi";
import { DarkHeader } from "@/ui/page-header";
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

const ORIGIN_TONE: Record<LeadCard["origin"], BadgeTone> = {
  cajugo: "dark",
  store_catalog: "neutral",
  seller: "info",
};

function LeadCardItem({ lead, now }: { lead: LeadCard; now: Date }) {
  const viaWhatsapp = lead.channel === "whatsapp";
  const vehicle = (
    <>
      {lead.vehicle.title}
      {lead.vehicle.deleted
        ? " · Veículo excluído"
        : lead.vehicle.priceCents !== null &&
          ` · ${brlWhole(lead.vehicle.priceCents)}`}
    </>
  );
  return (
    <li
      data-testid="lead-card"
      data-highlight={lead.highlight || undefined}
      className={cn(
        "flex flex-col gap-3 rounded-card border bg-surface p-3.5",
        lead.highlight ? "border-[1.5px] border-caju" : "border-line",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-bg text-[13px] font-bold"
        >
          {lead.initials ?? "WA"}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="flex items-baseline justify-between gap-2">
            <strong className="truncate text-[15px] font-extrabold">
              {viaWhatsapp ? "Contato pelo WhatsApp" : (lead.name ?? "Contato")}
            </strong>
            <span className="shrink-0 text-xs text-text-3">
              {relativeTime(lead.createdAt, now)}
            </span>
          </p>
          {lead.vehicle.deleted ? (
            <p className="text-[13px] text-text-2">{vehicle}</p>
          ) : (
            <p className="text-[13px] text-text-2">
              <Link
                href={`/painel/veiculos/${lead.vehicle.id}`}
                className="hover:underline"
              >
                {vehicle}
              </Link>
            </p>
          )}
          <div className="mt-1 flex flex-wrap gap-1.5">
            <Badge tone={STATUS_TONE[lead.status]} size="sm">
              {STATUS_LABEL[lead.status]}
            </Badge>
            <Badge tone={ORIGIN_TONE[lead.origin]} size="sm">
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
        <p className="rounded-xl bg-bg px-3.5 py-3 text-sm whitespace-pre-line text-ink-2">
          {lead.message}
        </p>
      )}
      <div className="flex items-center gap-2">
        {lead.whatsappUrl && (
          <a
            href={lead.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-whatsapp text-sm font-bold text-white"
          >
            <WhatsAppIcon size={16} />
            WhatsApp
          </a>
        )}
        {lead.telUrl && (
          <a
            href={lead.telUrl}
            aria-label="Ligar"
            className="flex size-11 flex-none items-center justify-center rounded-xl border border-field bg-surface"
          >
            <PhoneIcon size={17} />
          </a>
        )}
        <LeadActions leadId={lead.id} status={lead.status} />
      </div>
    </li>
  );
}

/** Tela Leads [3a] (LED-FR-005 a 010, 014), como na captura do design (012). */
export function LeadsBoardView({
  board,
  filter,
  now,
  storeName,
}: {
  board: LeadsBoard;
  filter: LeadFilter;
  now: Date;
  storeName?: string;
}) {
  return (
    <>
      <DarkHeader eyebrow={storeName} title="Leads">
        <div className="grid grid-cols-2 gap-2 lg:max-w-xl lg:gap-3">
          <Kpi
            tone="dark"
            value={board.newCount}
            label="Novos, sem resposta"
            testId="kpi-new-leads"
          />
          <Kpi
            tone="dark"
            value={board.cajugoShare === null ? "–" : `${board.cajugoShare}%`}
            label="Vieram da vitrine CajuGo (30 dias)"
            testId="kpi-cajugo-share"
          />
        </div>
      </DarkHeader>

      <section className="flex flex-col gap-3 pt-4 lg:pt-5">
        <nav
          aria-label="Filtrar leads"
          className="-mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0"
        >
          {LEAD_FILTERS.map((key) => (
            <Link
              key={key}
              href={filterHref(key)}
              aria-current={filter === key ? "page" : undefined}
              className="group flex h-11 flex-none items-center"
            >
              <span className="flex h-[34px] items-center gap-1.5 rounded-full border border-field bg-surface px-3.5 text-[13px] font-semibold group-aria-[current=page]:border-ink group-aria-[current=page]:bg-ink group-aria-[current=page]:text-white">
                {FILTER_LABEL[key]}
                <span className="opacity-60">{board.counts[key]}</span>
              </span>
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
            Quando alguém mandar mensagem ou tocar no WhatsApp de um veículo
            seu, o contato aparece aqui.
          </EmptyState>
        )}
      </section>
    </>
  );
}
