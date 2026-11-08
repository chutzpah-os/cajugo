import type { Metadata } from "next";
import { AreaPage } from "@/domains/auth/components/area-layout";
import { NoPermission } from "@/domains/auth/components/no-permission";
import { requireStorePage } from "@/domains/auth/guards";
import { cloudName } from "@/platform/cloudinary/cloudinary";
import { VehicleEditor } from "@/domains/vehicles/components/vehicle-editor";

export const metadata: Metadata = { title: "Novo veículo | CajuGo" };

async function Content() {
  const { allowed, home } = await requireStorePage(
    "/painel/veiculos/novo",
    "vehicles.manage",
  );
  if (!allowed) return <NoPermission home={home} />;
  return (
    <VehicleEditor
      title="Novo veículo"
      initial={null}
      cloudName={cloudName()}
    />
  );
}

/** Novo veículo [2a] (VEH-FR-003…009). */
export default function NewVehiclePage() {
  return (
    <AreaPage>
      <Content />
    </AreaPage>
  );
}
