import type { Metadata } from "next";
import { AreaPage } from "@/domains/auth/components/area-layout";
import { NoPermission } from "@/domains/auth/components/no-permission";
import { ProvisionalPage } from "@/domains/auth/components/provisional-page";
import { requireArea } from "@/domains/auth/guards";

export const metadata: Metadata = { title: "Assinaturas | CajuGo" };

async function Content() {
  const { allowed, home } = await requireArea("admin", "/admin/assinaturas");
  if (!allowed) return <NoPermission home={home} />;
  return (
    <ProvisionalPage title="Assinaturas" screen="4b">
      Assinaturas, planos e ações de suspender e reativar (spec 011).
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
