import type { storeStatus } from "@/platform/db/schema";
import type { Role, Session } from "@/platform/http/session";

export type StoreStatus = (typeof storeStatus.enumValues)[number];

/** Ordem do primeiro acesso: lojista → vendedor → indicador (AUT-FR-006). A equipe CajuGo não acumula papéis. */
const PANEL_ORDER: readonly Role[] = [
  "store_owner",
  "store_staff",
  "seller",
  "referrer",
  "admin",
  "support",
];

/** Painel que abre: o último usado, se a conta ainda tem o papel; senão o primeiro pela ordem. */
export function pickPanel(
  roles: readonly Role[],
  lastPanel: Role | null,
): Role | null {
  if (lastPanel && roles.includes(lastPanel)) return lastPanel;
  return PANEL_ORDER.find((r) => roles.includes(r)) ?? null;
}

function storeLanding(
  role: "store_owner" | "store_staff",
  status: StoreStatus | null,
): string {
  switch (status) {
    case "active":
    case "past_due":
    case "suspended":
    case "cancel_scheduled":
      return "/painel/veiculos";
  }
  // Pagamento e Conta são só do lojista; o usuário da loja vê o aviso (AUT-FR-016).
  if (role === "store_staff") return "/painel/loja-indisponivel";
  if (status === "registered") return "/lojistas/pagamento";
  if (status === "payment_review") return "/painel/pagamento";
  // cancelada, arquivada ou sem loja: só a Conta (AUT-FR-010)
  return "/painel/conta";
}

const PANEL_HOME: Record<
  Exclude<Role, "store_owner" | "store_staff">,
  string
> = {
  seller: "/rede",
  referrer: "/indica",
  admin: "/admin",
  support: "/admin",
};

/** Caminho para onde a pessoa vai depois de entrar (AUT-FR-006, 008, 009, 010, 015, 016). */
export function landingFor(
  account: Pick<Session, "roles" | "mustChangePassword">,
  context: { lastPanel: Role | null; storeStatus: StoreStatus | null },
): string {
  if (account.mustChangePassword) return "/nova-senha";
  const panel = pickPanel(account.roles, context.lastPanel);
  if (!panel) return "/";
  if (panel === "store_owner" || panel === "store_staff")
    return storeLanding(panel, context.storeStatus);
  return PANEL_HOME[panel];
}
