import type { Metadata } from "next";
import { AreaPage } from "@/domains/auth/components/area-layout";
import { NoPermission } from "@/domains/auth/components/no-permission";
import { ProvisionalPage } from "@/domains/auth/components/provisional-page";
import { requireArea } from "@/domains/auth/guards";

export const metadata: Metadata = { title: "Caju Indica | CajuGo" };

async function Content() {
  const { allowed, home } = await requireArea("admin", "/admin/indica");
  if (!allowed) return <NoPermission home={home} />;
  return (
    <ProvisionalPage title="Caju Indica" screen="8g">
      Indicações, regras e pagamentos do programa (spec 010).
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
