import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AreaPage } from "@/domains/auth/components/area-layout";
import { NoPermission } from "@/domains/auth/components/no-permission";
import { requireStorePage } from "@/domains/auth/guards";
import { paymentInReview } from "@/domains/billing/service";
import { brl } from "@/platform/br/money";
import { getDb } from "@/platform/db/client";

export const metadata: Metadata = {
  title: "Pagamento em análise | CajuGo",
  robots: { index: false, follow: false },
};

const brDateTime = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  dateStyle: "short",
  timeStyle: "short",
});

async function Content() {
  const { session, allowed, home } = await requireStorePage(
    "/painel/pagamento",
    "billing.manage",
  );
  if (!allowed) return <NoPermission home={home} />;
  const review = await paymentInReview({ db: getDb() }, session);
  if (!review) redirect("/painel");
  const days = review.reviewBusinessDays;

  return (
    <section className="flex flex-col gap-4 py-6">
      <h1 className="text-[22px] font-extrabold">Pagamento em análise</h1>
      <div
        role="status"
        className="flex flex-col gap-2 rounded-card bg-info-soft p-4 text-info"
      >
        <p className="font-bold">Comprovante recebido. Estamos conferindo.</p>
        <p className="text-sm">
          Enviado em {brDateTime.format(review.submittedAt)} ·{" "}
          {brl(review.paidCents)}. Conferimos em até {days}{" "}
          {days === 1 ? "dia útil" : "dias úteis"}.
        </p>
      </div>
      <p className="text-sm text-text-2">
        Enquanto isso, você já pode cadastrar e publicar os seus veículos: eles
        aparecem no catálogo quando o pagamento for confirmado e a sua loja for
        ao ar.
      </p>
    </section>
  );
}

/** Pagamento em análise [10a] (PIX-FR-006). */
export default function PaymentReviewPage() {
  return (
    <AreaPage>
      <Content />
    </AreaPage>
  );
}
