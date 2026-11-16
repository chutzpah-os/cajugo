import { leads, vehicles } from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";

/**
 * Leads da loja "Vitrine E2E" (spec 007), refeitos a cada seed (a limpeza dos veículos
 * da vitrine apaga os leads em cascata): um em cada status, um pelo WhatsApp, um Novo
 * há mais de 24 h e um de veículo excluído. Os criados pela tela nos testes somem no
 * próximo seed, junto com os veículos.
 */
export const E2E_LEADS = {
  newName: "Carla E2E",
  oldNewName: "Davi E2E",
  contactingName: "Edu E2E",
  negotiatingName: "Fabi E2E",
  soldName: "Gil E2E",
  deletedVehicleName: "Hugo E2E",
  /** Veículo excluído só para o lead "de veículo excluído". */
  deletedVehicleId: "00000000-0000-4000-8000-00000000e2d1",
} as const;

export async function seedLeads(
  db: Db,
  ids: { storeId: string; vehicleId: string },
  now: Date,
) {
  const L = E2E_LEADS;
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);
  await db.insert(vehicles).values({
    id: L.deletedVehicleId,
    storeId: ids.storeId,
    status: "deleted",
    make: "Fiat",
    model: "UNO",
  });
  const person = (name: string) => ({
    name,
    email: `${name.split(" ")[0].toLowerCase()}@e2e.test`,
    phone: "5579990000010",
    message: "Olá, tenho interesse no veículo.",
  });
  const base = {
    storeId: ids.storeId,
    vehicleId: ids.vehicleId,
    channel: "form",
    origin: "cajugo",
  } as const;
  await db.insert(leads).values([
    { ...base, ...person(L.newName), status: "new", createdAt: hoursAgo(1) },
    {
      ...base,
      ...person(L.oldNewName),
      status: "new",
      origin: "store_catalog",
      createdAt: hoursAgo(25),
    },
    {
      ...base,
      ...person(L.contactingName),
      status: "contacting",
      createdAt: hoursAgo(2),
    },
    {
      ...base,
      ...person(L.negotiatingName),
      status: "negotiating",
      createdAt: hoursAgo(3),
    },
    { ...base, ...person(L.soldName), status: "sold", createdAt: hoursAgo(4) },
    {
      ...base,
      channel: "whatsapp",
      status: "contacting",
      createdAt: hoursAgo(5),
    },
    {
      ...base,
      ...person(L.deletedVehicleName),
      vehicleId: L.deletedVehicleId,
      status: "lost",
      createdAt: hoursAgo(6),
    },
  ]);
}
