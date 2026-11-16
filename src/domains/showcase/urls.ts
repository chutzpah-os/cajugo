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

/** Cookie do código do vendedor: 30 dias, vale o último (SHW-FR-009). */
export const REF_COOKIE = "cajugo_ref";
export const REF_MAX_AGE = 30 * 24 * 60 * 60;

/** Código de vendedor do `?ref=`: só o formato esperado (SHW-SEC-005). */
export function parseRefCode(value: string | null | undefined): string | null {
  return value && /^[A-Za-z0-9]{3,20}$/.test(value)
    ? value.toUpperCase()
    : null;
}
