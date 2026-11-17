import type { Metadata } from "next";
import Link from "next/link";
import { AreaPage } from "@/domains/auth/components/area-layout";
import { NoPermission } from "@/domains/auth/components/no-permission";
import { requireStorePage } from "@/domains/auth/guards";
import { PartnersView } from "@/domains/sellers/components/partners-view";
import { storeNetwork } from "@/domains/sellers/service";
import { getDb } from "@/platform/db/client";

export const metadata: Metadata = { title: "Vendedores | Rede Caju" };

async function Content() {
  const { session, allowed, home } = await requireStorePage(
    "/painel/rede/vendedores",
    "sellers.manage",
  );
  if (!allowed) return <NoPermission home={home} />;
  const net = await storeNetwork(getDb(), session);
  return (
    <section className="flex flex-col gap-4 py-6">
      <header className="flex items-center gap-2">
        <Link
          href="/painel/conta"
          aria-label="Voltar para a Conta"
          className="-ml-2 flex size-11 items-center justify-center text-xl"
        >
          ‹
        </Link>
        <h1 className="text-[22px] font-extrabold">Vendedores</h1>
      </header>
      {!net.acceptsSellers && (
        <p className="rounded-card bg-info-soft p-3 text-sm text-info">
          Sua loja não está aceitando vendedores: os pedidos novos ficam
          bloqueados e as parcerias, suspensas.{" "}
          <Link href="/painel/rede/comissao" className="font-bold underline">
            Ligar em Comissão
          </Link>
        </p>
      )}
      <PartnersView pending={net.pending} partners={net.partners} />
    </section>
  );
}

/** Gerenciar vendedores [7f] (RCL-FR-004..007): só o lojista, sem cache. */
export default function Page() {
  return (
    <AreaPage>
      <Content />
    </AreaPage>
  );
}
