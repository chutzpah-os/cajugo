import { plainText } from "@/platform/br/slug";

/** Status do vendedor (GLOSSARY). Sem dependência de servidor. */
export type SellerStatus = "in_review" | "active" | "blocked";

export const SELLER_STATUS_LABEL: Record<SellerStatus, string> = {
  in_review: "Em análise",
  active: "Ativo",
  blocked: "Bloqueado",
};

/** Parceria como o vendedor vê no painel [7b]. */
export type PartnerState = "partner" | "pending";

export const PARTNER_LABEL: Record<PartnerState, string> = {
  partner: "Parceiro",
  pending: "Pendente",
};

/**
 * Códigos possíveis para o vendedor (SEL-FR-004), em ordem: o primeiro nome sem
 * acento e em maiúsculas, depois com 10, 11... Sempre no formato do `?ref=`
 * (`[A-Z0-9]{3,20}`, `parseRefCode`).
 */
export function codeCandidates(name: string, count: number): string[] {
  const first = plainText(name.trim().split(/\s+/)[0] ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 16);
  const base = first.length >= 3 ? first : `${first}CAJU`;
  return Array.from({ length: count }, (_, i) =>
    i === 0 ? base : `${base}${9 + i}`,
  );
}
