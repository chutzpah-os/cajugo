/**
 * Placa de veículo brasileira (VEH-FR-005): Mercosul (`ABC1D23`) ou antiga
 * (`ABC1234`), guardada em maiúsculas sem hífen. Só o último dígito (final de placa)
 * vai para página pública (VEH-SEC-002).
 */
export function parsePlate(
  value: string,
): { plate: string; end: string } | null {
  const plate = value.trim().toUpperCase().replace(/[\s-]/g, "");
  if (!/^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(plate)) return null;
  return { plate, end: plate.slice(-1) };
}
