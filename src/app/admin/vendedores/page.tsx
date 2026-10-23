import type { Metadata } from "next";
import { AreaPage } from "@/domains/auth/components/area-layout";
import { NoPermission } from "@/domains/auth/components/no-permission";
import { ProvisionalPage } from "@/domains/auth/components/provisional-page";
import { requireArea } from "@/domains/auth/guards";

export const metadata: Metadata = { title: "Rede Caju | CajuGo" };

async function Content() {
  const { allowed, home } = await requireArea("admin", "/admin/vendedores");
  if (!allowed) return <NoPermission home={home} />;
  return (
    <ProvisionalPage title="Rede Caju" screen="7h">
      Vendedores para aprovar e bloquear (spec 008).
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
