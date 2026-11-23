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

  return (
    <section className="flex flex-col gap-4 py-6">
      <h1 className="text-[22px] font-extrabold">Fatura do mês</h1>
      {view.open.length === 0 ? (
        <EmptyState
          icon="🧾"
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
          {view.open.map((invoice) => (
            <InvoiceCard key={invoice.id} invoice={invoice} />
          ))}
          {view.open.length > 1 && (
            <p className="text-sm text-text-2">
              {view.open.length} faturas em aberto. O pagamento quita da mais
              antiga para a mais nova.
            </p>
          )}
          <div className="flex items-center justify-between gap-3 rounded-card bg-caju-tint p-4">
            <span className="font-bold">Total a pagar</span>
            <span className="text-[20px] font-extrabold">
              {brl(view.openTotalCents)}
            </span>
          </div>
          <ButtonLink href={MONTHLY_PIX_PATH} block>
            Pagar com Pix
          </ButtonLink>
        </>
      )}
    </section>
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
