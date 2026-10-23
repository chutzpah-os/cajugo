import type { Metadata } from "next";
import { AreaPage } from "@/domains/auth/components/area-layout";
import { NoPermission } from "@/domains/auth/components/no-permission";
import { ProvisionalPage } from "@/domains/auth/components/provisional-page";
import { requireArea } from "@/domains/auth/guards";

export const metadata: Metadata = { title: "Pagamentos Pix | CajuGo" };

async function Content() {
  const { allowed, home } = await requireArea("admin", "/admin/pagamentos");
  if (!allowed) return <NoPermission home={home} />;
  return (
    <ProvisionalPage title="Pagamentos Pix" screen="10b">
      Comprovantes Pix para conferir e confirmar (spec 003).
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
