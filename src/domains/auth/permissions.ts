import { authorize, type Role, type Session } from "@/platform/http/session";

/** Áreas logadas e quem entra em cada uma (AUT-FR-012). */
export const AREAS = {
  painel: ["store_owner", "store_staff"],
  rede: ["seller"],
  indica: ["referrer"],
  admin: ["admin", "support"],
} as const satisfies Record<string, readonly Role[]>;

export type Area = keyof typeof AREAS;

/**
 * Ações e quem pode fazê-las. Toda action e todo botão de ação consulta este mapa.
 * Loja: usuário da loja só veículos, leads e venda (AUT-SEC-007).
 * Admin: suporte só lê e modera (AUT-SEC-008).
 */
export const PERMISSIONS = {
  "vehicles.manage": ["store_owner", "store_staff"],
  "leads.view": ["store_owner", "store_staff"],
  "sales.confirm": ["store_owner", "store_staff"],
  /** Minha loja. */
  "store.edit": ["store_owner"],
  /** Assinatura, fatura, pagamento e cancelamento. */
  "billing.manage": ["store_owner"],
  /** Comissão e vendedores da Rede Caju. */
  "sellers.manage": ["store_owner"],
  /** Caju Indica da loja. */
  "store.referral": ["store_owner"],

  "admin.read": ["admin", "support"],
  /** Aprovar veículos e tratar denúncias. */
  "admin.moderate": ["admin", "support"],
  /** Confirmar ou recusar comprovante. */
  "payments.review": ["admin"],
  /** Suspender ou reativar loja. */
  "stores.suspend": ["admin"],
  /** Aprovar ou bloquear vendedor. */
  "sellers.review": ["admin"],
  "users.temporaryPassword": ["admin"],
  "payouts.markPaid": ["admin"],
  "settings.edit": ["admin"],
  "team.manage": ["admin"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function authorizeArea(session: Session | null, area: Area): Session {
  return authorize(session, AREAS[area]);
}

export function authorizeTo(
  session: Session | null,
  permission: Permission,
): Session {
  return authorize(session, PERMISSIONS[permission]);
}

/** Para esconder botões; a checagem que vale é `authorizeTo` na action. */
export function can(session: Session | null, permission: Permission): boolean {
  const allowed: readonly Role[] = PERMISSIONS[permission];
  return !!session && session.roles.some((r) => allowed.includes(r));
}
