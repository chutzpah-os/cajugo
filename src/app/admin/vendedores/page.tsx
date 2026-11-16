import type { Metadata } from "next";
import { AreaPage } from "@/domains/auth/components/area-layout";
import { NoPermission } from "@/domains/auth/components/no-permission";
import { requireArea } from "@/domains/auth/guards";
import { can } from "@/domains/auth/service";
import { SellersAdminView } from "@/domains/sellers/components/sellers-admin";
import { sellersAdmin } from "@/domains/sellers/service";
import { getDb } from "@/platform/db/client";

export const metadata: Metadata = { title: "Rede Caju | CajuGo" };

async function Content() {
  const { session, allowed, home } = await requireArea(
    "admin",
    "/admin/vendedores",
  );
  if (!allowed || !can(session, "sellers.view"))
    return <NoPermission home={home} />;
  return (
    <section className="flex flex-col gap-4 py-6">
      <h1 className="text-[22px] font-extrabold">Rede Caju</h1>
      <p className="text-sm text-text-2">
        Confira o CPF, a foto do documento e os antecedentes (por fora, pelo
        CPF) antes de aprovar.
      </p>
      <SellersAdminView
        view={await sellersAdmin(getDb(), session)}
        canDecide={can(session, "sellers.review")}
      />
    </section>
  );
}

/** Vendedores do admin [7h] (SEL-FR-003, 004, 005, SEL-SEC-005): sem cache. */
export default function Page() {
  return (
    <AreaPage>
      <Content />
    </AreaPage>
  );
}
