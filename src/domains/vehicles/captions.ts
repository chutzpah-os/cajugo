/** Selo e legenda da divulgação por estado do veículo (PRD [1c], VEH-FR-002/010). */

export const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  pending_approval: "Em aprovação",
  published: "Publicado",
  hidden: "Oculto",
  sold: "Vendido",
  deleted: "Excluído",
};

export function shareCaption(v: {
  status: string;
  share: boolean;
  storeLive: boolean;
}): string {
  if (v.status === "sold") return "Removido de todos os catálogos";
  if (v.status !== "published") return "Publique para liberar";
  if (!v.storeLive) return "Aparece quando a loja for ativada";
  return v.share ? "Visível na vitrine CajuGo" : "Só no seu catálogo";
}

/** Cor do selo de status (DESIGN.md §3). */
export const STATUS_TONE: Record<
  string,
  "dark" | "ok" | "warn" | "info" | "neutral" | "caju"
> = {
  draft: "neutral",
  pending_approval: "info",
  published: "ok",
  hidden: "warn",
  sold: "dark",
  deleted: "neutral",
};

/** Nome do veículo: a versão da FIPE já traz o modelo ("ONIX HATCH LT 1.0…"). */
export function vehicleName(v: {
  version: string | null;
  model: string | null;
}) {
  return v.version ?? v.model ?? "Veículo sem nome";
}
