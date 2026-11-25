import { authorize, type Role, type Session } from "@/platform/http/session";

/** Áreas logadas e quem entra em cada uma (AUT-FR-012). */
export const AREAS = {
  painel: ["store_owner", "store_staff"],
  rede: ["seller"],
  /** Vendedor indica pelo mesmo painel, sem virar indicador (010, D4). */
  indica: ["referrer", "seller"],
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
  /** Mudar o status do lead [3a]; admin e suporte só leem (LED-SEC-005). */
  "leads.manage": ["store_owner", "store_staff"],
  "sales.confirm": ["store_owner", "store_staff"],
  /** Minha loja. */
  "store.edit": ["store_owner"],
  /** Assinatura, fatura, pagamento e cancelamento. */
  "billing.manage": ["store_owner"],
  /** Comissão e vendedores da Rede Caju. */
  "sellers.manage": ["store_owner"],
  /** Marcar e desfazer o "Recebi" da comissão [7d] (008b). */
  "commission.receive": ["seller"],
  /** Caju Indica da loja. */
  "store.referral": ["store_owner"],

  "admin.read": ["admin", "support"],
  /** Aprovar veículos e tratar denúncias. */
  "admin.moderate": ["admin", "support"],
  /** Ver "Alertas" e marcar como avisado (006d). */
  "alerts.notify": ["admin", "support"],
  /** Confirmar ou recusar comprovante. */
  "payments.review": ["admin"],
  /** Ver a fila de comprovantes e abrir os arquivos (PIX-SEC-003). */
  "payments.view": ["admin", "support"],
  /** Ver as assinaturas [4b] e avisar pelo `wa.me` (011). */
  "subscriptions.view": ["admin", "support"],
  /** Suspender ou reativar loja. */
  "stores.suspend": ["admin"],
  /** Ver os vendedores [7h] e as fotos do documento (008). */
  "sellers.view": ["admin", "support"],
  /** Aprovar ou bloquear vendedor. */
  "sellers.review": ["admin"],
  "users.temporaryPassword": ["admin"],
  "payouts.markPaid": ["admin"],
  "settings.edit": ["admin"],
  /** Convidar e remover gente da Equipe CajuGo (012b). */
  "team.manage": ["admin"],
  /** Criar loja e editar os dados dela pelo admin [1d], [6g] (012b). */
  "stores.manage": ["admin"],
  /** Marcar Recebi e Enviei nos pedidos do LaudoCaju (016). */
  "laudos.manage": ["admin"],
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
