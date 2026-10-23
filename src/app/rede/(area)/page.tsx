import { AreaPage } from "@/domains/auth/components/area-layout";
import { NoPermission } from "@/domains/auth/components/no-permission";
import { ProvisionalPage } from "@/domains/auth/components/provisional-page";
import { requireArea } from "@/domains/auth/guards";

async function Content() {
  const { allowed, home } = await requireArea("rede", "/rede");
  if (!allowed) return <NoPermission home={home} />;
  return (
    <ProvisionalPage title="Rede Caju" screen="7b">
      Painel do vendedor (spec 008).
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
