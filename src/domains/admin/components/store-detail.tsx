import Link from "next/link";
import type { ReactNode } from "react";
import { SetPassword } from "@/domains/auth/components/temporary-password-tool";
import {
  ReactivateButton,
  SuspendButton,
} from "@/domains/billing/components/subscription-decisions";
import { commissionToText } from "@/domains/sellers/commission";
import { brDate } from "@/platform/br/date";
import { brl } from "@/platform/br/money";
import { formatBrPhone } from "@/platform/br/phone";
import { Badge } from "@/ui/badge";
import { Initials } from "@/ui/initials";
import { Kpi } from "@/ui/kpi";
import type { AdminStoreDetail } from "../service";
import { StoreEditForm } from "./store-edit-form";
import { STORE_BADGE } from "./stores-admin";

const INVOICE_LABEL: Record<string, string> = {
  open: "Em aberto",
  paid: "Paga",
  overdue: "Atrasada",
  canceled: "Cancelada",
};

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section
      aria-label={title}
      className="flex flex-col gap-2 rounded-card border border-line bg-surface p-4"
    >
      <h2 className="text-[15px] font-extrabold">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line-2 py-1.5 text-sm last:border-0">
      <span className="text-text-2">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}

const actionClass =
  "flex min-h-12 items-center justify-between border-b border-line-2 text-[15px] font-bold";

/**
 * Detalhe da loja [6g] (ADM-FR-008, ADM-FR-009): cabeçalho, KPIs, cards e a lista de
 * ações (Editar dados, Ver catálogo, Senha temporária, Histórico no Log e, por último,
 * Suspender ou Reativar). O suporte vê tudo sem as ações de admin (ADM-SEC-002).
 */
export function StoreDetailView({
  view,
  catalogUrl,
}: {
  view: AdminStoreDetail;
  catalogUrl: string;
}) {
  const { store, kpis, owner, subscription, network, vehicles } = view;
  const [label, tone] = STORE_BADGE[store.status];
  const c = network.commission;
  const commission = c
    ? c.type === "pct"
      ? `${commissionToText(c.type, c.value)}%`
      : `R$ ${commissionToText(c.type, c.value)}`
    : "—";

  return (
    <div className="flex flex-col gap-4 py-6 lg:pt-2">
      <Link
        href="/admin/lojas"
        className="flex min-h-11 items-center text-sm font-semibold text-text-2"
      >
        ← Lojas
      </Link>
      <header data-header className="flex items-center gap-3">
        <Initials name={store.name} />
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="truncate text-[24px] font-extrabold tracking-[-0.02em]">
            {store.name}
          </h1>
          <p className="text-sm text-text-2">
            {store.city}
            {store.since && ` · cliente desde ${brDate.format(store.since)}`}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={tone} size="sm">
              {label}
            </Badge>
            <a
              href={catalogUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-11 items-center text-[13px] font-bold text-caju-ink"
            >
              Ver catálogo
            </a>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-2">
        <Kpi value={kpis.vehicles} label="Veículos" />
        <Kpi value={kpis.onCajugo} label="Na CajuGo" />
        <Kpi value={kpis.leadsThisMonth} label="Leads no mês" />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card title="Dono">
          <Row label="Nome" value={owner.name} />
          <Row label="E-mail" value={owner.email} />
          <Row
            label="Celular"
            value={owner.phone ? formatBrPhone(owner.phone) : "—"}
          />
          <Row label={owner.taxIdLabel} value={owner.taxId ?? "—"} />
        </Card>

        <Card title="Assinatura">
          <Row
            label="Plano"
            value={`${subscription.plan} · ${brl(subscription.membershipCents)}/mês`}
          />
          <Row
            label="Próxima cobrança"
            value={
              subscription.nextDueAt
                ? brDate.format(subscription.nextDueAt)
                : "—"
            }
          />
          <Row label="Total pago" value={brl(subscription.totalPaidCents)} />
          {subscription.invoices.length > 0 && (
            <details className="text-sm">
              <summary className="flex min-h-11 cursor-pointer items-center font-bold text-caju-ink">
                Faturas ({subscription.invoices.length})
              </summary>
              <ul className="flex flex-col">
                {subscription.invoices.map((i) => (
                  <li
                    key={i.id}
                    className="flex justify-between gap-2 border-b border-line-2 py-1.5 last:border-0"
                  >
                    <span>{i.label}</span>
                    <span className="font-semibold">
                      {brl(i.totalCents)} · {INVOICE_LABEL[i.status]}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          )}
          {view.canSuspend && (
            <Link
              href="/admin/pagamentos"
              className="flex min-h-11 items-center text-sm font-bold text-caju-ink"
            >
              Registrar pagamento sem comprovante
            </Link>
          )}
        </Card>

        <Card title="Rede Caju">
          <Row
            label="Aceita vendedores"
            value={network.acceptsSellers ? "Sim" : "Não"}
          />
          <Row label="Comissão padrão" value={commission} />
          <Row label="Parceiros" value={network.partners} />
          <Row label="Vendas no mês" value={network.salesThisMonth} />
        </Card>

        <Card title="Veículos">
          {vehicles.length === 0 ? (
            <p className="text-sm text-text-2">Nenhum veículo em estoque.</p>
          ) : (
            <ul className="flex flex-col">
              {vehicles.map((v) => (
                <li
                  key={v.id}
                  className="flex justify-between gap-2 border-b border-line-2 py-1.5 text-sm last:border-0"
                >
                  <span className="truncate font-semibold">
                    {[v.make, v.version ?? v.model, v.yearModel]
                      .filter(Boolean)
                      .join(" ")}
                  </span>
                  <span>{v.priceCents !== null ? brl(v.priceCents) : "—"}</span>
                </li>
              ))}
            </ul>
          )}
          <Link
            href={`/admin/lojas?aba=veiculos&q=${encodeURIComponent(store.name)}`}
            className="flex min-h-11 items-center text-sm font-bold text-caju-ink"
          >
            Ver todos ({kpis.vehicles})
          </Link>
        </Card>
      </div>

      <section
        aria-label="Ações da loja"
        className="flex flex-col rounded-card border border-line bg-surface px-4"
      >
        {view.edit && <StoreEditForm storeId={store.id} values={view.edit} />}
        <a
          href={catalogUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={actionClass}
        >
          Ver catálogo público <span aria-hidden>↗</span>
        </a>
        {view.canSetPassword && (
          <details className="group border-b border-line-2">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between text-[15px] font-bold [&::-webkit-details-marker]:hidden">
              Definir senha temporária
              <span aria-hidden className="text-text-3 group-open:rotate-90">
                ›
              </span>
            </summary>
            <div className="flex flex-col gap-2 pb-4">
              <p className="text-sm text-text-2">
                Confirme pelo WhatsApp que a conta é de {owner.name}. A senha
                aparece uma vez e obriga a troca no próximo login.
              </p>
              <SetPassword
                account={{
                  id: owner.profileId,
                  name: owner.name,
                  email: owner.email,
                  roles: owner.roles,
                }}
              />
            </div>
          </details>
        )}
        <Link href={`/admin/log?loja=${store.id}`} className={actionClass}>
          Histórico de atividade <span aria-hidden>›</span>
        </Link>
        {view.canSuspend && (
          <div className="py-3">
            {store.status === "suspended" ? (
              <ReactivateButton storeId={store.id} name={store.name} />
            ) : ["active", "past_due", "cancel_scheduled"].includes(
                store.status,
              ) ? (
              <SuspendButton
                storeId={store.id}
                name={store.name}
                days={0}
                amount=""
              />
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
