import type { Metadata } from "next";
import { AreaPage } from "@/domains/auth/components/area-layout";
import { NoPermission } from "@/domains/auth/components/no-permission";
import { requireStorePage } from "@/domains/auth/guards";
import { MONTHLY_PIX_PATH } from "@/domains/billing/components/billing-alert";
import { InvoiceCard } from "@/domains/billing/components/invoice-card";
import { invoiceView } from "@/domains/billing/service";
import { brl } from "@/platform/br/money";
import { getDb } from "@/platform/db/client";
import { ButtonLink } from "@/ui/button";
import { EmptyState } from "@/ui/empty-state";
import { Badge } from "@/ui/badge";
import { BackHeader } from "@/ui/page-header";

const brDay = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
});

export const metadata: Metadata = {
  title: "Fatura do mês | CajuGo",
  robots: { index: false, follow: false },
};

async function Content() {
  const { session, allowed, home } = await requireStorePage(
    "/painel/fatura",
    "billing.manage",
  );
  if (!allowed) return <NoPermission home={home} />;
  const view = await invoiceView({ db: getDb() }, session);

  const first = view.open[0];
  return (
    <>
      <BackHeader href="/painel/conta" label="Conta" title="Fatura do mês" />
      <section className="flex flex-col gap-4 pt-4 pb-24 lg:max-w-2xl">
        {view.open.length === 0 ? (
          <EmptyState
            title="Nenhuma fatura em aberto"
            action={
              <ButtonLink href="/painel/conta" variant="ghost">
                Ver a Conta
              </ButtonLink>
            }
          >
            A próxima fatura aparece aqui 3 dias antes do vencimento.
          </EmptyState>
        ) : (
          <>
            {view.lastRejection && (
              <div
                role="alert"
                className="rounded-card bg-caju-soft p-4 text-sm text-caju-deep"
              >
                <strong className="block">Comprovante recusado</strong>
                Motivo: {view.lastRejection.reason}.
                {view.lastRejection.missingCents && (
                  <span className="block">
                    Valor faltante: {brl(view.lastRejection.missingCents)}
                  </span>
                )}
                <span className="block">
                  Envie um novo comprovante pelo Pix.
                </span>
              </div>
            )}
            {/* Total a pagar e o vencimento, no topo como no [10c]. */}
            <div className="flex items-start justify-between gap-3 rounded-card border border-line bg-surface p-4">
              <div className="flex flex-col gap-0.5">
                <p className="text-[13px] text-text-3">Total a pagar</p>
                <p className="text-[30px] leading-none font-extrabold tracking-[-0.02em]">
                  {brl(view.openTotalCents)}
                </p>
              </div>
              {first && (
                <Badge tone={first.status === "late" ? "caju" : "warn"}>
                  {first.status === "late"
                    ? `Vencida ${brDay.format(first.dueAt)}`
                    : `Vence ${brDay.format(first.dueAt)}`}
                </Badge>
              )}
            </div>
            {view.open.map((invoice) => (
              <InvoiceCard key={invoice.id} invoice={invoice} />
            ))}
            {view.open.length > 1 && (
              <p className="text-sm text-text-2">
                {view.open.length} faturas em aberto. O pagamento quita da mais
                antiga para a mais nova.
              </p>
            )}
            <p className="text-xs text-text-3">
              Depois da tolerância de atraso, o catálogo e a vitrine saem do ar
              até o pagamento ser confirmado.
            </p>
            <div className="fixed inset-x-0 bottom-[calc(72px+env(safe-area-inset-bottom))] z-10 border-t border-line bg-surface px-4 py-3 lg:static lg:border-0 lg:bg-transparent lg:p-0">
              <ButtonLink href={MONTHLY_PIX_PATH} block>
                Pagar com Pix
              </ButtonLink>
            </div>
          </>
        )}
      </section>
    </>
  );
}

/** Fatura do mês [10c] (SUB-FR-002, SUB-FR-016). */
export default function InvoicePage() {
  return (
    <AreaPage>
      <Content />
    </AreaPage>
  );
}
