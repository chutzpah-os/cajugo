import type { Metadata } from "next";
import { AreaPage } from "@/domains/auth/components/area-layout";
import { NoPermission } from "@/domains/auth/components/no-permission";
import { requireArea } from "@/domains/auth/guards";
import { EmptyState } from "@/ui/empty-state";

export const metadata: Metadata = { title: "Extrato | CajuGo" };

async function Content() {
  const { allowed, home } = await requireArea("rede", "/rede/extrato");
  if (!allowed) return <NoPermission home={home} />;
  return (
    <section className="flex flex-col gap-4 py-6">
      <h1 className="text-[22px] font-extrabold">Extrato</h1>
      <EmptyState icon="🧾" title="Nenhuma venda ainda">
        Suas vendas aparecem aqui quando a loja confirmar.
      </EmptyState>
    </section>
  );
}

/** Extrato do vendedor [7d]: aviso até a spec 008b (SEL-FR-015). */
export default function Page() {
  return (
    <AreaPage>
      <Content />
    </AreaPage>
  );
}
