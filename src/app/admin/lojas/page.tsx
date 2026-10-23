import type { Metadata } from "next";
import { AreaPage } from "@/domains/auth/components/area-layout";
import { NoPermission } from "@/domains/auth/components/no-permission";
import { ProvisionalPage } from "@/domains/auth/components/provisional-page";
import { requireArea } from "@/domains/auth/guards";

export const metadata: Metadata = { title: "Lojas | CajuGo" };

async function Content() {
  const { allowed, home } = await requireArea("admin", "/admin/lojas");
  if (!allowed) return <NoPermission home={home} />;
  return (
    <ProvisionalPage title="Lojas" screen="1d">
      Lojas cadastradas, status e detalhe de cada loja (spec 012).
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
