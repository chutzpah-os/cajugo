import { AppError } from "./errors";

export type Role = "store_owner" | "admin" | "support";

/** Quem está fazendo a requisição. Montada no servidor a partir do Supabase Auth + `profiles` (spec 001). */
export type Session = {
  userId: string;
  role: Role;
  /** Loja do lojista; `null` para a equipe CajuGo. */
  storeId: string | null;
  mustChangePassword: boolean;
};

/**
 * Checa papel e troca obrigatória de senha. Sem sessão → 401; papel errado → 403.
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
  if (!roles.includes(session.role)) throw AppError.forbidden();
  return session;
}

/** Atalho para ações do lojista: garante papel e devolve o `storeId` da sessão. */
export function authorizeStore(
  session: Session | null,
): Session & { storeId: string } {
  const s = authorize(session, ["store_owner"]);
  if (!s.storeId) throw AppError.forbidden();
  return { ...s, storeId: s.storeId };
}
