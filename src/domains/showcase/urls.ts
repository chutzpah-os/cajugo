import { slugify } from "@/platform/br/slug";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;

/** Endereço único do veículo (SHW-FR-008): o id garante, o texto ajuda a busca. */
export function vehiclePath(v: {
  id: string;
  make: string | null;
  model: string | null;
  yearModel: number | null;
  city: string;
  state: string;
}): string {
  const text = slugify(
    [v.make, v.model, v.yearModel, v.city, v.state].filter(Boolean).join(" "),
  );
  return `/v/${v.id}${text ? `-${text}` : ""}`;
}

/** Id de um parâmetro `{id}-texto`; `null` se não começa com um id válido. */
export function idFromVehicleParam(param: string): string | null {
  return UUID.exec(param)?.[0] ?? null;
}
