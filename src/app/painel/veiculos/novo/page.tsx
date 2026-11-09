import type { Metadata } from "next";
import { AreaPage } from "@/domains/auth/components/area-layout";
import { NoPermission } from "@/domains/auth/components/no-permission";
import { requireStorePage } from "@/domains/auth/guards";
import { cloudName } from "@/platform/cloudinary/cloudinary";
import { vehicleDefaults } from "@/domains/stores/service";
import { VehicleEditor } from "@/domains/vehicles/components/vehicle-editor";
import { getDb } from "@/platform/db/client";

export const metadata: Metadata = { title: "Novo veículo | CajuGo" };

async function Content() {
  const { session, allowed, home } = await requireStorePage(
    "/painel/veiculos/novo",
    "vehicles.manage",
  );
  if (!allowed) return <NoPermission home={home} />;
  const defaults = session.storeId
    ? await vehicleDefaults(getDb(), session.storeId)
    : undefined;
  return (
    <VehicleEditor
      title="Novo veículo"
      initial={null}
      defaults={defaults}
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
