import { AreaPage } from "@/domains/auth/components/area-layout";
import { NoPermission } from "@/domains/auth/components/no-permission";
import { ProvisionalPage } from "@/domains/auth/components/provisional-page";
import { requireStorePage } from "@/domains/auth/guards";

async function Content() {
  const { allowed, home } = await requireStorePage(
    "/painel/veiculos",
    "vehicles.manage",
  );
  if (!allowed) return <NoPermission home={home} />;
  return (
    <ProvisionalPage title="Meus veículos" screen="1c">
      Aqui ficarão os veículos da loja (spec 004).
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
