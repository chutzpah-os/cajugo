/** CPF e CNPJ: validação (módulo 11), normalização e máscara (PIX-FR-002, PIX-SEC-005). */

export type TaxIdType = "cpf" | "cnpj";

const onlyDigits = (s: string) => s.replace(/\D/g, "");

const CPF_WEIGHTS = [
  [10, 9, 8, 7, 6, 5, 4, 3, 2],
  [11, 10, 9, 8, 7, 6, 5, 4, 3, 2],
];
const CNPJ_WEIGHTS = [
  [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
];

function validCheckDigits(value: string, weights: number[][]): boolean {
  if (/^(\d)\1+$/.test(value)) return false;
  return weights.every((w) => {
    const sum = w.reduce((acc, wi, i) => acc + Number(value[i]) * wi, 0);
    const dv = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    return dv === Number(value[w.length]);
  });
}

export function isValidCpf(value: string): boolean {
  const d = onlyDigits(value);
  return d.length === 11 && validCheckDigits(d, CPF_WEIGHTS);
}

export function isValidCnpj(value: string): boolean {
  const d = onlyDigits(value);
  return d.length === 14 && validCheckDigits(d, CNPJ_WEIGHTS);
}

/** CPF (11 dígitos) ou CNPJ (14) válido, só os dígitos; `null` se inválido. */
export function parseTaxId(
  value: string,
): { type: TaxIdType; digits: string } | null {
  const digits = onlyDigits(value);
  if (digits.length === 11)
    return isValidCpf(digits) ? { type: "cpf", digits } : null;
  if (digits.length === 14)
    return isValidCnpj(digits) ? { type: "cnpj", digits } : null;
  return null;
}

/** Para o dono ver o próprio documento: CPF `529.***.***-25`; CNPJ com os 2 primeiros e os 6 últimos dígitos. */
export function maskTaxId(type: TaxIdType, digits: string): string {
  return type === "cpf"
    ? `${digits.slice(0, 3)}.***.***-${digits.slice(9)}`
    : `${digits.slice(0, 2)}.***.***/${digits.slice(8, 12)}-${digits.slice(12)}`;
}
