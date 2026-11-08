import type { Metadata } from "next";
import { AreaPage } from "@/domains/auth/components/area-layout";
import { NoPermission } from "@/domains/auth/components/no-permission";
import { requireStorePage } from "@/domains/auth/guards";
import { Onboarding } from "@/domains/stores/components/onboarding";
import { onboardingStatus } from "@/domains/stores/service";
import { getDb } from "@/platform/db/client";
import { ButtonLink } from "@/ui/button";
import { EmptyState } from "@/ui/empty-state";

export const metadata: Metadata = { title: "Meus veículos | CajuGo" };

async function Content() {
  const { session, allowed, home } = await requireStorePage(
    "/painel/veiculos",
    "vehicles.manage",
  );
  if (!allowed) return <NoPermission home={home} />;
  const status = await onboardingStatus(getDb(), session);

  return (
    <section className="flex flex-col gap-4 py-6">
      <h1 className="text-[22px] font-extrabold">Meus veículos</h1>
      <Onboarding status={status} />
      {/* Sem veículos ainda: a lista de [1c] entra com a spec 005. */}
      <EmptyState
        icon="🚗"
        title="Nenhum veículo cadastrado"
        action={
          <ButtonLink href="/painel/veiculos/novo">
            Cadastrar primeiro veículo
          </ButtonLink>
        }
      >
        Cadastre o primeiro veículo para ele aparecer no seu catálogo.
      </EmptyState>
    </section>
  );
}

/** Meus veículos [1c] com o onboarding [5e] (PIX-FR-012). */
export default function VehiclesPage() {
  return (
    <AreaPage>
      <Content />
    </AreaPage>
  );
}
