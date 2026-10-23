import { AreaPage } from "@/domains/auth/components/area-layout";
import { NoPermission } from "@/domains/auth/components/no-permission";
import { ProvisionalPage } from "@/domains/auth/components/provisional-page";
import { requireStorePage } from "@/domains/auth/guards";

async function Content() {
  const { allowed, home } = await requireStorePage(
    "/painel/pagamento",
    "billing.manage",
  );
  if (!allowed) return <NoPermission home={home} />;
  return (
    <ProvisionalPage title="Pagamento em análise" screen="10a">
      Comprovante recebido. Estamos conferindo (spec 003).
    </ProvisionalPage>
  );
}

export default function Page() {
  return (
    <AreaPage>
      <Content />
    </AreaPage>
  );
}
