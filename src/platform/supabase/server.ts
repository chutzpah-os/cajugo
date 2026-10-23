import {
  createServerClient,
  type CookieMethodsServer,
  type CookieOptions,
} from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AuthProvider, AuthUser, SignOutScope } from "./auth-provider";

/**
 * Cookies da sessão: fora do alcance de scripts (AUT-SEC-006) e válidos por 30 dias,
 * regravados a cada renovação do token (AUT-FR-004). A inatividade é checada em `getSession`.
 */
export const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: 30 * 24 * 60 * 60,
} satisfies CookieOptions;

/**
 * O `@supabase/ssr` grava todo cookie com 400 dias, ignorando `cookieOptions.maxAge`.
 * Aplicado em todo `setAll`: mantém os 30 dias e preserva a remoção (`maxAge: 0`).
 */
export function withSessionMaxAge(options: CookieOptions): CookieOptions {
  return options.maxAge
    ? { ...options, maxAge: AUTH_COOKIE_OPTIONS.maxAge }
    : options;
}

function env(
  name: "SUPABASE_URL" | "SUPABASE_PUBLISHABLE_KEY" | "SUPABASE_SECRET_KEY",
) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} não definida (veja .env.example).`);
  return value;
}

/** Cliente do Supabase Auth ligado aos cookies da requisição. Um por requisição, nunca compartilhado. */
export function createSupabaseServerClient(cookies: CookieMethodsServer) {
  return createServerClient(
    env("SUPABASE_URL"),
    env("SUPABASE_PUBLISHABLE_KEY"),
    {
      cookies,
      cookieOptions: AUTH_COOKIE_OPTIONS,
    },
  );
}

/** Cliente com a chave secreta: só ações de admin no servidor, sem sessão. */
function createSupabaseAdminClient() {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const toUser = (u: { id: string; email?: string }): AuthUser => ({
  id: u.id,
  email: u.email ?? "",
});

/** `AuthProvider` real (Supabase Auth). Nenhum outro arquivo importa o SDK do Supabase. */
export class SupabaseAuthProvider implements AuthProvider {
  constructor(private readonly client: SupabaseClient) {}

  async signInWithPassword(email: string, password: string) {
    const { data, error } = await this.client.auth.signInWithPassword({
      email,
      password,
    });
    // Credencial inválida vira `null`; falha do serviço sobe como erro (não é "senha errada").
    if (error?.status === 400) return null;
    if (error) throw error;
    return data.user ? toUser(data.user) : null;
  }

  async getUser() {
    const { data, error } = await this.client.auth.getUser();
    if (error || !data.user) return null;
    return toUser(data.user);
  }

  async signOut(scope: SignOutScope) {
    const { error } = await this.client.auth.signOut({ scope });
    if (error) throw error;
  }

  async updateOwnPassword(password: string) {
    const { error } = await this.client.auth.updateUser({ password });
    if (error) throw error;
  }

  async adminUpdatePassword(userId: string, password: string) {
    const { error } =
      await createSupabaseAdminClient().auth.admin.updateUserById(userId, {
        password,
      });
    if (error) throw error;
  }

  async adminCreateUser(email: string, password: string) {
    const { data, error } =
      await createSupabaseAdminClient().auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
    if (error) throw error;
    return toUser(data.user);
  }
}
