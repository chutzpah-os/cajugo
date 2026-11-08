import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AreaPage } from "@/domains/auth/components/area-layout";
import { NoPermission } from "@/domains/auth/components/no-permission";
import { requireStorePage } from "@/domains/auth/guards";
import { cloudName } from "@/platform/cloudinary/cloudinary";
import { VehicleEditor } from "@/domains/vehicles/components/vehicle-editor";
import { vehicleForm } from "@/domains/vehicles/service";
import { getDb } from "@/platform/db/client";
import { AppError } from "@/platform/http/errors";

export const metadata: Metadata = { title: "Editar veículo | CajuGo" };

async function Content({ params }: PageProps<"/painel/veiculos/[id]/editar">) {
  const { id } = await params;
  const { session, allowed, home } = await requireStorePage(
    `/painel/veiculos/${id}/editar`,
    "vehicles.manage",
  );
  if (!allowed) return <NoPermission home={home} />;
  const view = await vehicleForm(getDb(), session, id).catch(
    (error: unknown) => {
      if (error instanceof AppError && error.status === 404) notFound();
      throw error;
    },
  );
  return (
    <VehicleEditor
      title="Editar veículo"
      initial={view}
      cloudName={cloudName()}
    />
  );
}

/** Editar veículo [2a], aberto pelo resumo [6e] ou pela lista [1c]. */
export default function EditVehiclePage(
  props: PageProps<"/painel/veiculos/[id]/editar">,
) {
  return (
    <AreaPage>
      <Content {...props} />
    </AreaPage>
  );
}
