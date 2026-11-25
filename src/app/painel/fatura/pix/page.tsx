import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AreaPage } from "@/domains/auth/components/area-layout";
import { NoPermission } from "@/domains/auth/components/no-permission";
import { requireStorePage } from "@/domains/auth/guards";
import { PixPayment } from "@/domains/billing/components/pix-payment";
import { paymentInReview, pixView } from "@/domains/billing/service";
import { getDb } from "@/platform/db/client";
import { AppError } from "@/platform/http/errors";
import { BackHeader } from "@/ui/page-header";

export const metadata: Metadata = {
  title: "Pagar a fatura | CajuGo",
  robots: { index: false, follow: false },
};

async function Content() {
  const { session, allowed, home } = await requireStorePage(
    "/painel/fatura/pix",
    "billing.manage",
  );
  if (!allowed) return <NoPermission home={home} />;
  const deps = { db: getDb() };
  if (await paymentInReview(deps, session)) redirect("/painel/pagamento");
  const view = await pixView(deps, session).catch((error: unknown) => {
    if (error instanceof AppError && error.status === 409)
      return "unavailable" as const;
    throw error;
  });
  if (!view) redirect("/painel/fatura");

  return (
    <section className="flex flex-col gap-3 pb-6 lg:max-w-2xl">
      <BackHeader href="/painel/fatura" label="Fatura" title="Pague com Pix" />
      {view === "unavailable" ? (
        <p role="status" className="rounded-card bg-warn-soft p-4 text-warn">
          O pagamento está indisponível no momento. Fale com a CajuGo pelo
          WhatsApp em Conta.
        </p>
      ) : (
        <PixPayment view={view} />
      )}
    </section>
  );
}

/** Pix da fatura mensal [6c] (SUB-FR-002, SUB-FR-003, SUB-FR-016): o total em aberto. */
export default function MonthlyPixPage() {
  return (
    <AreaPage>
      <Content />
    </AreaPage>
  );
}
