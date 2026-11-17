import { AreaPage } from "@/domains/auth/components/area-layout";
import { NoPermission } from "@/domains/auth/components/no-permission";
import { ProvisionalPage } from "@/domains/auth/components/provisional-page";
import { requireStorePage } from "@/domains/auth/guards";
import { NetworkBlock } from "@/domains/sellers/components/network-block";
import { networkSummary } from "@/domains/sellers/service";
import { getDb } from "@/platform/db/client";

async function Content() {
  const { session, allowed, home } = await requireStorePage(
    "/painel/conta",
    "billing.manage",
  );
  if (!allowed) return <NoPermission home={home} />;
  // Rede Caju já vale (009); assinatura, fatura e cancelamento chegam na 011.
  const network = await networkSummary(getDb(), session);
  return (
    <>
      <ProvisionalPage title="Conta" screen="3c">
        Assinatura, fatura e cancelamento (spec 011).
      </ProvisionalPage>
      <NetworkBlock {...network} />
    </>
  );
}

export default function Page() {
  return (
    <AreaPage>
      <Content />
    </AreaPage>
  );
}
