import { randomInt } from "node:crypto";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { profiles, stores, userRole } from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";
import { logActivity } from "@/platform/http/activity-log";
import { hashIp } from "@/platform/http/client-ip";
import { AppError, fieldErrorsFromZod } from "@/platform/http/errors";
import {
  consumeRateLimit,
  peekRateLimit,
  RATE_LIMITS,
} from "@/platform/http/rate-limit";
import { safeNext } from "@/platform/http/safe-next";
import { authorize, type Role, type Session } from "@/platform/http/session";
import type { AuthProvider } from "@/platform/supabase/auth-provider";
import { landingFor, pickPanel } from "./landing";
import { authorizeTo } from "./permissions";
import { TEAM_ROLES } from "./roles";
import {
  newPasswordSchema,
  panelSchema,
  signInSchema,
  type SignInInput,
} from "./schemas";

export type AuthDeps = { db: Db; auth: AuthProvider; now?: () => Date };

/** Mesmo erro para e-mail inexistente, senha errada e temporária vencida (AUT-FR-002). */
function invalidCredentials() {
  return new AppError("invalid-credentials", "E-mail ou senha incorretos", 401);
}

/** Status da loja da sessão (`null` sem loja). */
export async function storeStatusOf(db: Db, storeId: string | null) {
  if (!storeId) return null;
  const [store] = await db
    .select({ status: stores.status })
    .from(stores)
    .where(eq(stores.id, storeId));
  return store?.status ?? null;
}

/** Senha temporária não usada a tempo deixa de valer (AUT-FR-014). */
function tempPasswordExpired(
  p: { mustChangePassword: boolean; tempPasswordExpiresAt: Date | null },
  now: Date,
) {
  return (
    p.mustChangePassword &&
    p.tempPasswordExpiresAt !== null &&
    p.tempPasswordExpiresAt <= now
  );
}

/**
 * Login por e-mail e senha (AUT-FR-001). Devolve para onde a pessoa vai.
 * Bloqueio (AUT-FR-003): por rede, 5 tentativas/min; por e-mail, 5 falhas em 15 min.
 * `ctx.ipHash` é o IP já com hash (`hashIp(clientIp(headers))`).
 */
export async function signIn(
  deps: AuthDeps,
  input: SignInInput,
  ctx: { ipHash: string },
): Promise<{ redirectTo: string }> {
  const now = deps.now?.() ?? new Date();
  const network = await consumeRateLimit(
    deps.db,
    `login:ip:${ctx.ipHash}`,
    RATE_LIMITS.login,
    now,
  );
  if (!network.ok) throw AppError.tooManyRequests(network.retryAfterSeconds);

  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) throw invalidCredentials();
  const { email, password, next } = parsed.data;

  const emailKey = `login:email:${hashIp(email)}`;
  const rule = RATE_LIMITS.loginFailuresPerEmail;
  const lock = await peekRateLimit(deps.db, emailKey, rule, now);
  if (!lock.ok) throw AppError.tooManyRequests(lock.retryAfterSeconds);
  const fail = async () => {
    await consumeRateLimit(deps.db, emailKey, rule, now);
    return invalidCredentials();
  };

  const user = await deps.auth.signInWithPassword(email, password);
  if (!user) throw await fail();

  const [profile] = await deps.db
    .select({
      roles: profiles.roles,
      lastPanel: profiles.lastPanel,
      storeId: profiles.storeId,
      mustChangePassword: profiles.mustChangePassword,
      tempPasswordExpiresAt: profiles.tempPasswordExpiresAt,
    })
    .from(profiles)
    .where(eq(profiles.id, user.id));

  const tempExpired = profile && tempPasswordExpired(profile, now);
  if (!profile || tempExpired) {
    await deps.auth.signOut("local");
    throw await fail();
  }

  await deps.db
    .update(profiles)
    .set({ lastLoginAt: now, lastSeenAt: now })
    .where(eq(profiles.id, user.id));

  const landing = landingFor(profile, {
    lastPanel: profile.lastPanel,
    storeStatus: await storeStatusOf(deps.db, profile.storeId),
  });
  if (profile.mustChangePassword) return { redirectTo: landing };
  return { redirectTo: safeNext(next, landing) };
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const ALL_ROLES: readonly Role[] = userRole.enumValues;

/**
 * Sessão da requisição: usuário validado no provedor + `profiles` (AUT-FR-004, AUT-FR-015).
 * Encerra a sessão após inatividade (30 dias; equipe 1 dia) ou senha temporária vencida.
 * `last_seen_at` é gravado no máximo 1×/hora.
 */
export async function getSession(deps: AuthDeps): Promise<Session | null> {
  const now = deps.now?.() ?? new Date();
  const user = await deps.auth.getUser();
  if (!user) return null;

  const [profile] = await deps.db
    .select({
      roles: profiles.roles,
      lastPanel: profiles.lastPanel,
      storeId: profiles.storeId,
      mustChangePassword: profiles.mustChangePassword,
      tempPasswordExpiresAt: profiles.tempPasswordExpiresAt,
      lastSeenAt: profiles.lastSeenAt,
    })
    .from(profiles)
    .where(eq(profiles.id, user.id));

  const activeRole = profile && pickPanel(profile.roles, profile.lastPanel);
  const idleLimit = profile?.roles.some((r) => TEAM_ROLES.includes(r))
    ? DAY_MS
    : 30 * DAY_MS;
  const idle =
    profile?.lastSeenAt &&
    now.getTime() - profile.lastSeenAt.getTime() > idleLimit;
  const tempExpired = profile && tempPasswordExpired(profile, now);
  if (!profile || !activeRole || idle || tempExpired) {
    await deps.auth.signOut("local");
    return null;
  }

  if (
    !profile.lastSeenAt ||
    now.getTime() - profile.lastSeenAt.getTime() >= HOUR_MS
  ) {
    await deps.db
      .update(profiles)
      .set({ lastSeenAt: now })
      .where(eq(profiles.id, user.id));
  }

  return {
    userId: user.id,
    roles: profile.roles,
    activeRole,
    storeId: profile.storeId,
    mustChangePassword: profile.mustChangePassword,
  };
}

/** Sai só deste aparelho e volta à vitrine (AUT-FR-005). */
export async function signOut(deps: AuthDeps): Promise<{ redirectTo: string }> {
  await deps.auth.signOut("local");
  return { redirectTo: "/" };
}

/**
 * Troca de painel sem novo login (AUT-FR-007). Só aceita papel que a conta já tem
 * e só grava o `last_panel` da própria sessão (AUT-SEC-001, AUT-SEC-002).
 */
export async function switchPanel(
  deps: AuthDeps,
  session: Session | null,
  role: unknown,
): Promise<{ redirectTo: string }> {
  const s = authorize(session, ALL_ROLES);
  const parsed = panelSchema.safeParse(role);
  if (!parsed.success || !s.roles.includes(parsed.data))
    throw AppError.forbidden();

  await deps.db
    .update(profiles)
    .set({ lastPanel: parsed.data })
    .where(eq(profiles.id, s.userId));

  return {
    redirectTo: landingFor(s, {
      lastPanel: parsed.data,
      storeStatus: await storeStatusOf(deps.db, s.storeId),
    }),
  };
}

const TEMP_PASSWORD_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

/** 12 caracteres aleatórios (crypto), sem os ambíguos (0/O, 1/l/I) para ditar ao lojista. */
export function generateTemporaryPassword(length = 12): string {
  let password = "";
  for (let i = 0; i < length; i++)
    password +=
      TEMP_PASSWORD_ALPHABET[randomInt(TEMP_PASSWORD_ALPHABET.length)];
  return password;
}

/**
 * Admin define uma senha temporária (AUT-FR-014): vale 24 h e obriga a troca no 1º acesso.
 * Só `admin` (AUT-SEC-004, AUT-SEC-008). A senha volta uma única vez e nunca é gravada
 * em claro nem na auditoria (AUT-SEC-003).
 */
export async function setTemporaryPassword(
  deps: AuthDeps,
  session: Session | null,
  targetUserId: unknown,
): Promise<{ password: string }> {
  const admin = authorizeTo(session, "users.temporaryPassword");
  const now = deps.now?.() ?? new Date();
  const id = z.uuid().safeParse(targetUserId);
  if (!id.success) throw AppError.notFound();
  const [target] = await deps.db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.id, id.data));
  if (!target) throw AppError.notFound();

  const password = generateTemporaryPassword();
  await deps.auth.adminUpdatePassword(target.id, password);
  await deps.db
    .update(profiles)
    .set({
      mustChangePassword: true,
      tempPasswordExpiresAt: new Date(now.getTime() + DAY_MS),
    })
    .where(eq(profiles.id, target.id));
  await logActivity(deps.db, {
    userId: admin.userId,
    action: "auth.temp_password_set",
    entity: "profile",
    entityId: target.id,
  });
  return { password };
}

/**
 * Cria a nova senha (AUT-FR-015). Única ação liberada com senha temporária:
 * por isso só exige sessão, não `authorize`. Encerra as sessões dos outros aparelhos.
 */
export async function updatePassword(
  deps: AuthDeps,
  session: Session | null,
  input: unknown,
): Promise<{ redirectTo: string }> {
  if (!session) throw AppError.unauthorized();
  const parsed = newPasswordSchema.safeParse(input);
  if (!parsed.success)
    throw AppError.validation(fieldErrorsFromZod(parsed.error));

  await deps.auth.updateOwnPassword(parsed.data.password);
  await deps.db
    .update(profiles)
    .set({ mustChangePassword: false, tempPasswordExpiresAt: null })
    .where(eq(profiles.id, session.userId));
  await deps.auth.signOut("others");

  return {
    redirectTo: landingFor(
      { roles: session.roles, mustChangePassword: false },
      {
        lastPanel: session.activeRole,
        storeStatus: await storeStatusOf(deps.db, session.storeId),
      },
    ),
  };
}

/** Conta encontrada pelo admin/suporte: só o que a tela mostra (saída explícita, API.md §2). */
export type AccountSummary = {
  id: string;
  name: string;
  email: string;
  roles: Role[];
};

/** Busca de conta por e-mail no admin (leitura: admin e suporte, AUT-SEC-008). */
export async function findAccountByEmail(
  deps: AuthDeps,
  session: Session | null,
  email: unknown,
): Promise<AccountSummary | null> {
  authorizeTo(session, "admin.read");
  const parsed = z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email())
    .safeParse(email);
  if (!parsed.success) return null;
  const [account] = await deps.db
    .select({
      id: profiles.id,
      name: profiles.name,
      email: profiles.email,
      roles: profiles.roles,
    })
    .from(profiles)
    .where(eq(profiles.email, parsed.data));
  return account ?? null;
}
