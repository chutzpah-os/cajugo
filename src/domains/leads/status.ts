/**
 * Status do lead (PRD §5.4, LED-FR-008): Novo → Em contato → Negociando → Vendido;
 * Perdido de qualquer status aberto. Sem dependência de servidor: vale na tela e no serviço.
 */
export type LeadStatus = "new" | "contacting" | "negotiating" | "sold" | "lost";
export type LeadOrigin = "cajugo" | "store_catalog";

export const STATUS_LABEL: Record<LeadStatus, string> = {
  new: "Novo",
  contacting: "Em contato",
  negotiating: "Negociando",
  sold: "Vendido",
  lost: "Perdido",
};

export const ORIGIN_LABEL: Record<LeadOrigin, string> = {
  cajugo: "via CajuGo",
  store_catalog: "Seu catálogo",
};

const NEXT: Partial<Record<LeadStatus, LeadStatus>> = {
  new: "contacting",
  contacting: "negotiating",
  negotiating: "sold",
};

export const nextStatus = (s: LeadStatus): LeadStatus | null => NEXT[s] ?? null;

export const isOpen = (s: LeadStatus): boolean => s in NEXT;

const DAY_MS = 86_400_000;

/** Lead "Novo" há mais de 24 horas ganha destaque (LED-FR-009). */
export const highlighted = (
  status: LeadStatus,
  createdAt: Date,
  now: Date,
): boolean => status === "new" && now.getTime() - createdAt.getTime() > DAY_MS;
