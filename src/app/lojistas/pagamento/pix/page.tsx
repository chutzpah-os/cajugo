import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AreaPage } from "@/domains/auth/components/area-layout";
import { NoPermission } from "@/domains/auth/components/no-permission";
import { requireStorePage } from "@/domains/auth/guards";
import { PixPayment } from "@/domains/billing/components/pix-payment";
import { pixView } from "@/domains/billing/service";
import { getDb } from "@/platform/db/client";
import { AppError } from "@/platform/http/errors";

export const metadata: Metadata = {
  title: "Pague com Pix | CajuGo",
  robots: { index: false, follow: false },
};

async function Content() {
  const { session, allowed, home } = await requireStorePage(
    "/lojistas/pagamento/pix",
    "billing.manage",
  );
  if (!allowed) return <NoPermission home={home} />;
  // Chave não pronta (409): volta para [5d], que explica; outro erro sobe.
  const view = await pixView({ db: getDb() }, session).catch(
    (error: unknown) => {
      if (error instanceof AppError && error.status === 409) return null;
      throw error;
    },
  );
  // Sem fatura aberta (não passou por [5d]) ou chave não pronta: volta para [5d].
  if (!view) redirect("/lojistas/pagamento");

  return (
    <section className="flex flex-col gap-5 py-6">
      <h1 className="text-[24px] font-extrabold tracking-[-0.02em]">
        Pague com Pix
      </h1>

      <PixPayment view={view} />
    </section>
  );
}

/** Pix manual [6c] (PIX-FR-004, 005, 006; PIX-SEC-002). */
export default function PixPage() {
  return (
    <AreaPage>
      <Content />
    </AreaPage>
  );
}
