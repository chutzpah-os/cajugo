import type { userRole } from "../db/schema";
import { AppError } from "./errors";

export type Role = (typeof userRole.enumValues)[number];

/** Papéis que trabalham no painel de uma loja (`storeId` obrigatório). */
export const STORE_ROLES = ["store_owner", "store_staff"] as const;

/** Quem está fazendo a requisição. Montada no servidor a partir do Supabase Auth + `profiles` (spec 001). */
export type Session = {
  userId: string;
  /** Todos os papéis da conta (PRD §2). Permissão é checada contra eles. */
  roles: readonly Role[];
  /** Painel aberto agora: só navegação, nunca permissão (AUT-FR-007). */
  activeRole: Role;
  /** Loja do lojista ou do usuário da loja; `null` para os demais. */
  storeId: string | null;
  mustChangePassword: boolean;
};

/**
 * Checa papel e troca obrigatória de senha. Sem sessão → 401; nenhum papel permitido → 403.
 * Posse de recurso não é aqui: é no `where` da query, com `storeId` da sessão (SECURITY.md §4).
 */
export function authorize(
  session: Session | null,
  roles: readonly Role[],
): Session {
  if (!session) throw AppError.unauthorized();
  if (session.mustChangePassword) {
    throw new AppError(
      "must-change-password",
      "Crie uma nova senha para continuar",
      403,
    );
  }
  if (!session.roles.some((r) => roles.includes(r))) throw AppError.forbidden();
  return session;
}

/** Atalho para ações da loja: garante papel de loja e devolve o `storeId` da sessão. */
export function authorizeStore(
  session: Session | null,
  roles: readonly Role[] = STORE_ROLES,
): Session & { storeId: string } {
  const s = authorize(session, roles);
  if (!s.storeId) throw AppError.forbidden();
  return { ...s, storeId: s.storeId };
}
