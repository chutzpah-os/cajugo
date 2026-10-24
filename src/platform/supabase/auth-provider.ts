import { AppError } from "../http/errors";

/** Usuário do provedor de login (Supabase Auth). Papéis e loja ficam em `profiles`. */
export type AuthUser = { id: string; email: string };

export type SignOutScope = "local" | "others" | "global";

/**
 * Tudo que o domínio `auth` precisa do provedor de login.
 * Em produção: Supabase Auth (src/platform/supabase/server.ts). Nos testes: `FakeAuthProvider`.
 */
export interface AuthProvider {
  signInWithPassword(email: string, password: string): Promise<AuthUser | null>;
  /** Confere a senha de uma conta sem abrir nem trocar a sessão atual (confirmações sensíveis). */
  verifyPassword(email: string, password: string): Promise<boolean>;
  /** Usuário da sessão atual, validado no provedor (nunca só lido do cookie). */
  getUser(): Promise<AuthUser | null>;
  signOut(scope: SignOutScope): Promise<void>;
  /** Troca a senha de quem está conectado. */
  updateOwnPassword(password: string): Promise<void>;
  /** Ações de administrador (chave secreta, só servidor). */
  adminUpdatePassword(userId: string, password: string): Promise<void>;
  /** Encerra todas as sessões da conta, em qualquer aparelho. */
  adminSignOutAll(userId: string): Promise<void>;
  adminCreateUser(email: string, password: string): Promise<AuthUser>;
}

/** Senha nova igual à atual: o provedor recusa; vira erro no campo, não falha genérica. */
export function samePassword() {
  return AppError.validation([
    {
      field: "password",
      code: "same_password",
      message: "Use uma senha diferente da atual.",
    },
  ]);
}
