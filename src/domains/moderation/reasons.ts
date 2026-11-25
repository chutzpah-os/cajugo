/**
 * Motivos da denúncia [14d] e do Ocultar [6f] (spec 007b). Sem dependência de servidor:
 * vale na tela e no serviço.
 */
export const REPORT_REASONS = [
  "sold",
  "unreal_price",
  "wrong_photos",
  "scam",
  "provenance_omitted",
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

/** O Ocultar aceita os motivos da denúncia e "Outro", com nota (RPT-FR-004). */
export const HIDE_REASONS = [...REPORT_REASONS, "other"] as const;
export type HideReason = (typeof HIDE_REASONS)[number];

export const REASON_LABEL: Record<HideReason, string> = {
  sold: "Já vendido",
  unreal_price: "Preço não real",
  wrong_photos: "Fotos de outro carro",
  scam: "Suspeita de golpe",
  provenance_omitted: "Procedência ou sinistro omitido",
  other: "Outro",
};

/** Motivo do Ocultar como a loja vê (RPT-FR-006): "Outro" mostra a nota da CajuGo. */
export const hiddenReasonText = (
  reason: HideReason,
  note: string | null,
): string => (reason === "other" && note ? note : REASON_LABEL[reason]);
