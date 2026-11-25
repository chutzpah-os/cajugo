import Link from "next/link";
import { Badge, type BadgeTone } from "@/ui/badge";
import { ButtonLink } from "@/ui/button";
import { EmptyState } from "@/ui/empty-state";
import { WhatsAppIcon } from "@/ui/icons";
import { Kpi } from "@/ui/kpi";
import { DarkHeader } from "@/ui/page-header";
import { StoreCard } from "@/ui/store-card";
import { EditPlanButton } from "./edit-plan";
import { brl } from "@/platform/br/money";
import type {
  SubscriptionFilter,
  SubscriptionItem,
  SubscriptionsView,
} from "../service";
import { ReactivateButton, SuspendButton } from "./subscription-decisions";

const brDate = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
});
const brDay = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
});
const days = (n: number) => `${n} ${n === 1 ? "dia" : "dias"}`;

const FILTERS: [SubscriptionFilter, string][] = [
  ["todas", "Todas"],
  ["em-dia", "Em dia"],
  ["atrasadas", "Atrasadas"],
  ["suspensas", "Suspensas"],
  ["cancelamento", "Cancelamento agendado"],
  ["canceladas", "Canceladas"],
];

const BADGE: Record<SubscriptionItem["status"], [string, BadgeTone]> = {
  active: ["Em dia", "ok"],
  past_due: ["Atrasada", "warn"],
  suspended: ["Suspensa", "neutral"],
  cancel_scheduled: ["Cancelamento agendado", "info"],
  canceled: ["Cancelada", "neutral"],
};

function WhatsApp({ href }: { href: string }) {
  return (
    <ButtonLink href={href} variant="whatsapp" size="sm" className="flex-none">
      <WhatsAppIcon size={15} />
      Avisar
    </ButtonLink>
  );
}

const sinceLabel = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  month: "short",
  year: "numeric",
});
const since = (d: Date) =>
  sinceLabel.format(d).replace(". de ", "/").replace(" de ", "/");

/** Informação do rodapé do card: rótulo pequeno e o valor ([4b]). */
function Info({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "warn" | "muted";
}) {
  return (
    <span className="flex flex-col">
      <span className="text-xs text-text-3">{label}</span>
      <span
        className={
          tone === "warn"
            ? "text-sm font-extrabold text-warn"
            : tone === "muted"
              ? "text-sm font-bold text-text-2"
              : "text-sm font-extrabold text-ink"
        }
      >
        {value}
      </span>
    </span>
  );
}

function Card({ item }: { item: SubscriptionItem }) {
  const [label, tone] = BADGE[item.status];
  const { line } = item;
  const info =
    line.kind === "ok" ? (
      <Info
        label="Próxima cobrança"
        value={`${line.nextDueAt ? brDay.format(line.nextDueAt) : "—"} · ${brl(line.amountCents)}`}
      />
    ) : line.kind === "late" ? (
      <Info
        label="Em atraso"
        value={`${days(line.days)} · ${brl(line.amountCents)}`}
        tone="warn"
      />
    ) : line.kind === "review" ? (
      <Info
        label="Comprovante enviado"
        value={brDay.format(line.submittedAt)}
      />
    ) : line.kind === "suspended" ? (
      <Info label="Catálogo e vitrine" value="Fora do ar" tone="warn" />
    ) : line.kind === "canceling" ? (
      <Info
        label={`Termina em ${brDay.format(line.until)}`}
        value={line.reason ?? "Sem motivo informado"}
        tone="muted"
      />
    ) : (
      <Info
        label={`Cancelada em ${brDay.format(line.at)}`}
        value={line.reason ?? "Sem motivo informado"}
        tone="muted"
      />
    );
  const small = "flex h-11 items-center";
  const face =
    "flex h-[38px] items-center rounded-[10px] px-3.5 text-[13px] font-bold";
  const action =
    line.kind === "review" ? (
      <Link href="/admin/pagamentos" className={small}>
        <span className={`${face} bg-ink text-white`}>Conferir</span>
      </Link>
    ) : line.kind === "ok" ? (
      <Link href={`/loja/${item.slug}`} className={small}>
        <span className={`${face} border border-field bg-surface`}>
          Detalhes
        </span>
      </Link>
    ) : item.whatsappUrl ? (
      <a
        href={item.whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Cobrar ${item.name} no WhatsApp`}
        className={small}
      >
        <span className={`${face} gap-1.5 bg-whatsapp text-white`}>
          <WhatsAppIcon size={15} />
          Cobrar
        </span>
      </a>
    ) : undefined;
  return (
    <StoreCard
      testId="subscription"
      name={item.name}
      subtitle={`${item.owner}${item.since ? ` · desde ${since(item.since)}` : ""}`}
      badge={
        <Badge tone={line.kind === "review" ? "info" : tone} size="sm">
          {line.kind === "review" ? "Em análise" : label}
        </Badge>
      }
      footer={info}
      action={action}
    >
      {(item.canSuspend && line.kind !== "suspended") || item.canReactivate ? (
        <div className="flex flex-col gap-2">
          {item.canSuspend && line.kind !== "suspended" && (
            <SuspendButton
              storeId={item.storeId}
              name={item.name}
              days={line.kind === "late" ? line.days : 0}
              amount={line.kind === "late" ? brl(line.amountCents) : ""}
            />
          )}
          {item.canReactivate && (
            <ReactivateButton storeId={item.storeId} name={item.name} />
          )}
        </div>
      ) : null}
    </StoreCard>
  );
}

/** Assinaturas [4b] (SUB-FR-011, 012, 013, 006), como na captura; o suporte vê sem os botões. */
export function SubscriptionsAdmin({ view }: { view: SubscriptionsView }) {
  return (
    <>
      <DarkHeader eyebrow="CajuGo Admin" title="Assinaturas">
        <p className="flex items-baseline gap-2">
          <span
            className="text-[30px] leading-none font-extrabold tracking-[-0.02em]"
            data-testid="mrr"
          >
            {brl(view.mrrCents)}
          </span>
          <span className="text-[13px] text-on-dark-2 lg:text-text-3">
            receita mensal recorrente
          </span>
        </p>
        <div className="grid grid-cols-3 gap-2 lg:max-w-2xl lg:gap-3">
          <Kpi tone="dark" value={view.counts.ok} label="Em dia" />
          <Kpi tone="dark" value={view.counts.late} label="Atrasadas" />
          <Kpi tone="dark" value={view.counts.suspended} label="Suspensas" />
        </div>
      </DarkHeader>

      <section className="flex flex-col gap-3 pt-4 lg:pt-5">
        <div className="flex items-center justify-between gap-3 rounded-[14px] border border-line bg-surface p-3.5">
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="text-[15px] font-extrabold">{view.plan.name}</p>
            <p className="text-xs text-text-3">
              {brl(view.plan.membershipCents)}/mês · {view.plan.stores}{" "}
              {view.plan.stores === 1 ? "loja" : "lojas"}
            </p>
            {view.plan.upcoming && (
              <p className="text-xs font-semibold" data-testid="plan-upcoming">
                Passa a {brl(view.plan.upcoming.membershipCents)} a partir de{" "}
                {brDate.format(view.plan.upcoming.validFrom)}
              </p>
            )}
          </div>
          {view.plan.canEdit && (
            <EditPlanButton earliest={view.plan.earliestChange} />
          )}
        </div>

        <nav
          aria-label="Filtrar assinaturas"
          className="-mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0"
        >
          {FILTERS.map(([value, label]) => (
            <Link
              key={value}
              href={
                value === "todas"
                  ? "/admin/assinaturas"
                  : `/admin/assinaturas?filtro=${value}`
              }
              aria-current={view.filter === value ? "page" : undefined}
              className="group flex h-11 flex-none items-center"
            >
              <span className="flex h-[34px] items-center rounded-full border border-field bg-surface px-3.5 text-[13px] font-semibold group-aria-[current=page]:border-ink group-aria-[current=page]:bg-ink group-aria-[current=page]:text-white">
                {label}
              </span>
            </Link>
          ))}
        </nav>

        {view.dueSoon.length > 0 && (
          <section aria-labelledby="vencem" className="flex flex-col gap-2">
            <h2 id="vencem" className="text-base font-extrabold">
              Vencem em 3 dias
            </h2>
            <ul className="flex flex-col gap-2">
              {view.dueSoon.map((d) => (
                <li
                  key={d.storeId}
                  className="flex items-center justify-between gap-3 rounded-[14px] border border-line bg-surface p-3.5"
                >
                  <p className="text-sm">
                    <strong>{d.name}</strong>
                    <span className="block text-xs text-text-3">
                      vence {brDay.format(d.dueAt)} · {brl(d.amountCents)}
                    </span>
                  </p>
                  <WhatsApp href={d.whatsappUrl} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {view.items.length ? (
          <ul className="grid gap-3 md:grid-cols-2">
            {view.items.map((item) => (
              <Card key={item.storeId} item={item} />
            ))}
          </ul>
        ) : (
          <EmptyState title="Nenhuma loja aqui">
            Nenhuma assinatura neste filtro.
          </EmptyState>
        )}
      </section>
    </>
  );
}
