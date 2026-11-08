import type { Metadata } from "next";
import { NoPermission } from "@/domains/auth/components/no-permission";
import { AreaPage } from "@/domains/auth/components/area-layout";
import { requireStorePage } from "@/domains/auth/guards";
import { CheckoutForm } from "@/domains/billing/components/checkout-form";
import { checkoutView } from "@/domains/billing/service";
import { brl } from "@/platform/br/money";
import { getDb } from "@/platform/db/client";

export const metadata: Metadata = {
  title: "Pagamento | CajuGo",
  robots: { index: false, follow: false },
};

async function Content() {
  const { session, allowed, home } = await requireStorePage(
    "/lojistas/pagamento",
    "billing.manage",
  );
  if (!allowed) return <NoPermission home={home} />;
  const view = await checkoutView({ db: getDb() }, session);
  const amount = brl(view.membershipCents);
  const rejection = view.lastRejection;

  return (
    <section className="flex flex-col gap-5 py-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-[24px] font-extrabold tracking-[-0.02em]">
          {rejection ? "Comprovante recusado" : "Pagamento"}
        </h1>
        <p className="text-sm text-text-3">2 de 2 · pagamento por Pix</p>
        <div aria-hidden className="grid grid-cols-2 gap-1">
          <span className="h-1 rounded-full bg-caju" />
          <span className="h-1 rounded-full bg-caju" />
        </div>
      </div>

      {rejection && (
        <div
          role="alert"
          className="flex flex-col gap-1 rounded-card bg-caju-soft p-4 text-sm text-caju-deep"
        >
          <p className="font-bold">Motivo: {rejection.reason}</p>
          {rejection.missingCents && (
            <p>Valor faltante: {brl(rejection.missingCents)}</p>
          )}
          <p className="text-text-2">
            Confirme o documento e envie um novo comprovante.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2 rounded-card bg-ink p-4 text-white">
        <p className="text-sm text-on-dark-2">
          Plano Catálogo · {view.storeName}
        </p>
        <p className="text-[28px] font-extrabold">
          {amount}
          <span className="text-base font-semibold text-on-dark-2">/mês</span>
        </p>
        <p className="text-sm text-on-dark-2">
          Vencimento no dia da 1ª confirmação · Sem fidelidade
        </p>
        <p className="text-sm">
          ✓ Você pode cancelar a assinatura a qualquer momento.
        </p>
      </div>

      <CheckoutForm
        amountLabel={amount}
        maskedTaxId={view.taxId?.masked ?? null}
        pixReady={view.pixReady}
        supportUrl={view.supportUrl}
      />
    </section>
  );
}

/** Pagamento [5d] e comprovante recusado [12e] (PIX-FR-001, 002, 004, 010; PIX-SEC-006). */
export default function PaymentPage() {
  return (
    <AreaPage>
      <Content />
    </AreaPage>
  );
}
