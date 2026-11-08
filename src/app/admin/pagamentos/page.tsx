import type { Metadata } from "next";
import { AreaPage } from "@/domains/auth/components/area-layout";
import { NoPermission } from "@/domains/auth/components/no-permission";
import { requireArea } from "@/domains/auth/guards";
import { ManualPayment } from "@/domains/billing/components/manual-payment";
import { ReviewQueue } from "@/domains/billing/components/review-queue";
import { reviewQueue } from "@/domains/billing/service";
import { getDb } from "@/platform/db/client";

export const metadata: Metadata = { title: "Pagamentos Pix | CajuGo" };

async function Content() {
  const { session, allowed, home } = await requireArea(
    "admin",
    "/admin/pagamentos",
  );
  if (!allowed) return <NoPermission home={home} />;
  const queue = await reviewQueue({ db: getDb() }, session);

  return (
    <section className="flex flex-col gap-4 py-6">
      <h1 className="text-[22px] font-extrabold">Pagamentos Pix</h1>
      {!queue.pixReady && (
        <p
          role="alert"
          className="rounded-card bg-warn-soft p-3 text-sm font-bold text-warn"
        >
          Chave Pix não configurada: os lojistas não conseguem pagar. Configure
          em Conta.
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-card border border-line bg-surface p-3">
          <p className="text-[24px] font-extrabold" data-testid="kpi-waiting">
            {queue.waiting}
          </p>
          <p className="text-xs text-text-3">aguardando conferência</p>
        </div>
        <div className="rounded-card border border-line bg-surface p-3">
          <p className="text-[24px] font-extrabold" data-testid="kpi-confirmed">
            {queue.confirmedThisMonth}
          </p>
          <p className="text-xs text-text-3">confirmados no mês</p>
        </div>
      </div>
      <p className="rounded-card bg-info-soft p-3 text-sm text-info">
        Confira no extrato se o valor caiu na chave antes de confirmar.
      </p>
      <ReviewQueue items={queue.items} canReview={queue.canReview} />
      {queue.canReview && <ManualPayment />}
    </section>
  );
}

/** Pagamentos Pix [10b] (PIX-FR-007…011; PIX-SEC-003). */
export default function PaymentsPage() {
  return (
    <AreaPage>
      <Content />
    </AreaPage>
  );
}
