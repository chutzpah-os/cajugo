import type { Metadata } from "next";
import { AreaPage } from "@/domains/auth/components/area-layout";
import { NoPermission } from "@/domains/auth/components/no-permission";
import { requireArea } from "@/domains/auth/guards";
import { SellerHome } from "@/domains/sellers/components/seller-home";
import { sellerHome } from "@/domains/sellers/service";
import { getDb } from "@/platform/db/client";

export const metadata: Metadata = { title: "Rede Caju | CajuGo" };

async function Content() {
  const { session, allowed, home } = await requireArea("rede", "/rede-caju");
  if (!allowed) return <NoPermission home={home} />;
  return (
    <section className="flex flex-col gap-4 py-6">
      <h1 className="text-[22px] font-extrabold">Rede Caju</h1>
      <SellerHome home={await sellerHome(getDb(), session)} />
    </section>
  );
}

/** Início do vendedor [7b] (SEL-FR-002, 006): status ou painel, sem cache. */
export default function Page() {
  return (
    <AreaPage>
      <Content />
    </AreaPage>
  );
}
