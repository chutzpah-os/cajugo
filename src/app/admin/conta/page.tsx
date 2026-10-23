import type { Metadata } from "next";
import { AreaPage } from "@/domains/auth/components/area-layout";
import { NoPermission } from "@/domains/auth/components/no-permission";
import { ProvisionalPage } from "@/domains/auth/components/provisional-page";
import { requireArea } from "@/domains/auth/guards";

export const metadata: Metadata = { title: "Conta | CajuGo" };

async function Content() {
  const { allowed, home } = await requireArea("admin", "/admin/conta");
  if (!allowed) return <NoPermission home={home} />;
  return (
    <ProvisionalPage title="Conta" screen="4c">
      Equipe CajuGo e configurações da plataforma (spec 002).
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
