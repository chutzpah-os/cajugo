import type { Metadata } from "next";
import Link from "next/link";
import { AreaPage } from "@/domains/auth/components/area-layout";
import { NoPermission } from "@/domains/auth/components/no-permission";
import { requireStorePage } from "@/domains/auth/guards";
import { CommissionForm } from "@/domains/sellers/components/commission-form";
import { VehicleOverrides } from "@/domains/sellers/components/vehicle-overrides";
import { storeNetwork } from "@/domains/sellers/service";
import { getDb } from "@/platform/db/client";

export const metadata: Metadata = { title: "Comissão | Rede Caju" };

async function Content() {
  const { session, allowed, home } = await requireStorePage(
    "/painel/rede/comissao",
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
        <h1 className="text-[22px] font-extrabold">Comissão</h1>
      </header>
      <CommissionForm
        acceptsSellers={net.acceptsSellers}
        commission={net.commission}
        feeBps={net.feeBps}
      />
      <VehicleOverrides
        overrides={net.overrides}
        vehicles={net.vehicleOptions}
      />
    </section>
  );
}

/** Configurar comissão [7e] (RCL-FR-001, 002, 003): só o lojista, sem cache. */
export default function Page() {
  return (
    <AreaPage>
      <Content />
    </AreaPage>
  );
}
