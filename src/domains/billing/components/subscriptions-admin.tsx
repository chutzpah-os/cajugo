import Link from "next/link";
import { Badge, type BadgeTone } from "@/ui/badge";
import { ButtonLink } from "@/ui/button";
import { EmptyState } from "@/ui/empty-state";
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
];

const BADGE: Record<SubscriptionItem["status"], [string, BadgeTone]> = {
  active: ["Em dia", "ok"],
  past_due: ["Em atraso", "warn"],
  suspended: ["Suspensa", "dark"],
  cancel_scheduled: ["Cancelamento agendado", "info"],
  canceled: ["Cancelada", "neutral"],
};

function WhatsApp({ href }: { href: string }) {
  return (
    <ButtonLink href={href} variant="whatsapp" block>
      Avisar no WhatsApp
    </ButtonLink>
  );
}

function Card({ item }: { item: SubscriptionItem }) {
  const [label, tone] = BADGE[item.status];
  const { line } = item;
  return (
    <li
      data-testid="subscription"
      className="flex flex-col gap-2 rounded-card border border-line bg-surface p-4"
    >
      <header className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold">{item.name}</p>
          <p className="text-sm text-text-2">
            {item.owner}
            {item.since && ` · assina desde ${brDate.format(item.since)}`}
          </p>
        </div>
        <Badge tone={line.kind === "review" ? "info" : tone}>
          {line.kind === "review" ? "Em análise" : label}
        </Badge>
      </header>
      {line.kind === "ok" && (
        <p className="text-sm">
          Próxima cobrança {line.nextDueAt ? brDay.format(line.nextDueAt) : "—"}{" "}
          · {brl(line.amountCents)}
        </p>
      )}
      {line.kind === "late" && (
        <p className="text-sm font-semibold text-warn">
          Em atraso {days(line.days)} · {brl(line.amountCents)}
        </p>
      )}
      {line.kind === "review" && (
        <p className="text-sm">
          Comprovante enviado {brDay.format(line.submittedAt)}
        </p>
      )}
      {line.kind === "suspended" && (
        <p className="text-sm font-semibold text-warn">
          Catálogo e vitrine · Fora do ar
        </p>
      )}
      <div className="flex flex-col gap-2">
        {line.kind === "review" && (
          <ButtonLink href="/admin/pagamentos" block>
            Conferir
          </ButtonLink>
        )}
        {line.kind === "ok" && (
          <Link
            href={`/loja/${item.slug}`}
            className="flex min-h-11 items-center text-sm font-bold text-caju-ink underline underline-offset-2"
          >
            Detalhes
          </Link>
        )}
        {line.kind !== "ok" && item.whatsappUrl && (
          <WhatsApp href={item.whatsappUrl} />
        )}
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
    </li>
  );
}

/** Assinaturas [4b] (SUB-FR-011, 012, 013, 006): o suporte vê sem os botões. */
export function SubscriptionsAdmin({ view }: { view: SubscriptionsView }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="col-span-2 rounded-card bg-ink p-4 text-white md:col-span-1">
          <p className="text-sm text-on-dark-2">MRR</p>
          <p className="text-[22px] font-extrabold" data-testid="mrr">
            {brl(view.mrrCents)}
          </p>
        </div>
        {(
          [
            ["Em dia", view.counts.ok],
            ["Atrasadas", view.counts.late],
            ["Suspensas", view.counts.suspended],
          ] as const
        ).map(([label, n]) => (
          <div
            key={label}
            className="rounded-card border border-line bg-surface p-4"
          >
            <p className="text-sm text-text-2">{label}</p>
            <p className="text-[22px] font-extrabold">{n}</p>
          </div>
        ))}
      </div>

      <section className="rounded-card border border-line bg-surface p-4">
        <p className="font-bold">{view.plan.name}</p>
        <p className="text-sm text-text-2">
          {brl(view.plan.membershipCents)}/mês · {view.plan.stores}{" "}
          {view.plan.stores === 1 ? "loja" : "lojas"}
        </p>
      </section>

      {view.dueSoon.length > 0 && (
        <section aria-labelledby="vencem" className="flex flex-col gap-2">
          <h2 id="vencem" className="text-[17px] font-extrabold">
            Vencem em 3 dias
          </h2>
          <ul className="flex flex-col gap-2">
            {view.dueSoon.map((d) => (
              <li
                key={d.storeId}
                className="flex flex-col gap-2 rounded-card border border-line bg-surface p-4"
              >
                <p className="text-sm">
                  <strong>{d.name}</strong> · vence {brDay.format(d.dueAt)} ·{" "}
                  {brl(d.amountCents)}
                </p>
                <WhatsApp href={d.whatsappUrl} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <nav aria-label="Filtrar assinaturas" className="flex flex-wrap gap-2">
        {FILTERS.map(([value, label]) => (
          <Link
            key={value}
            href={
              value === "todas"
                ? "/admin/assinaturas"
                : `/admin/assinaturas?filtro=${value}`
            }
            aria-current={view.filter === value ? "page" : undefined}
            className={`inline-flex h-11 items-center rounded-full border px-3.5 text-sm font-semibold ${
              view.filter === value
                ? "border-ink bg-ink text-white"
                : "border-field bg-surface text-ink"
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {view.items.length ? (
        <ul className="grid gap-3 md:grid-cols-2">
          {view.items.map((item) => (
            <Card key={item.storeId} item={item} />
          ))}
        </ul>
      ) : (
        <EmptyState icon="🧾" title="Nenhuma loja aqui">
          Nenhuma assinatura neste filtro.
        </EmptyState>
      )}
    </div>
  );
}
