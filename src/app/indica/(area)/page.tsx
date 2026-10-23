import { AreaPage } from "@/domains/auth/components/area-layout";
import { NoPermission } from "@/domains/auth/components/no-permission";
import { ProvisionalPage } from "@/domains/auth/components/provisional-page";
import { requireArea } from "@/domains/auth/guards";

async function Content() {
  const { allowed, home } = await requireArea("indica", "/indica");
  if (!allowed) return <NoPermission home={home} />;
  return (
    <ProvisionalPage title="Caju Indica" screen="9d">
      Painel do indicador (spec 010).
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
