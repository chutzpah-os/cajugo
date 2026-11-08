import { randomInt } from "node:crypto";
import { eq } from "drizzle-orm";
import { profiles, stores, userRole } from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";
import { logActivity } from "@/platform/http/activity-log";
import { hashIp } from "@/platform/http/client-ip";
import { AppError, fieldErrorsFromZod } from "@/platform/http/errors";
import {
  countRecentEvents,
  lastEvent,
  RATE_LIMITS,
  recordEvent,
} from "@/platform/http/rate-limit";
import { safeNext } from "@/platform/http/safe-next";
import { authorize, type Role, type Session } from "@/platform/http/session";
import type { AuthProvider } from "@/platform/supabase/auth-provider";
import { landingFor, pickPanel } from "./landing";
import { AREAS, authorizeTo, type Area } from "./permissions";
import { TEAM_ROLES } from "./roles";
import {
  accountEmailSchema,
  changePasswordSchema,
  newPasswordSchema,
  panelSchema,
  signInSchema,
  userIdSchema,
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

/** Perfil da conta como o login e a sessão precisam (papéis, painel, loja, senha). */
async function loadProfile(db: Db, userId: string) {
  const [profile] = await db
    .select({
      roles: profiles.roles,
      lastPanel: profiles.lastPanel,
      storeId: profiles.storeId,
      mustChangePassword: profiles.mustChangePassword,
      tempPasswordExpiresAt: profiles.tempPasswordExpiresAt,
      lastSeenAt: profiles.lastSeenAt,
    })
    .from(profiles)
    .where(eq(profiles.id, userId));
  return profile;
}

const LOCK_MS = RATE_LIMITS.loginFailuresPerEmail.windowSeconds * 1000;

/**
 * Bloqueio de tentativas de senha (AUT-FR-003), o mesmo no login e nas confirmações
 * por senha (CFG-SEC-005, CFG-SEC-006). Janela deslizante e só com falhas: por rede,
 * 5 no último minuto; por e-mail, a 5ª em 15 min bloqueia por 15 min a partir dela.
 */
function passwordGuard(db: Db, ipHash: string, now: Date) {
  const network = RATE_LIMITS.loginFailuresPerNetwork;
  const perEmail = RATE_LIMITS.loginFailuresPerEmail;
  const networkKey = `login:fail:ip:${ipHash}`;
  const keys = (email: string) => {
    const hash = hashIp(email);
    return {
      fail: `login:fail:email:${hash}`,
      lock: `login:lock:email:${hash}`,
    };
  };
  return {
    async assertNetworkAllowed() {
      const failures = await countRecentEvents(
        db,
        networkKey,
        network.windowSeconds,
        now,
      );
      if (failures >= network.limit)
        throw AppError.tooManyRequests(network.windowSeconds);
    },
    async assertEmailAllowed(email: string) {
      const lockedAt = await lastEvent(db, keys(email).lock);
      if (lockedAt && now.getTime() - lockedAt.getTime() < LOCK_MS)
        throw AppError.tooManyRequests(
          Math.ceil((lockedAt.getTime() + LOCK_MS - now.getTime()) / 1000),
        );
    },
    /** Falha conta para a rede e, se houver e-mail, para a conta. */
    async recordFailure(email?: string) {
      await recordEvent(db, networkKey, now);
      if (!email) return;
      const { fail, lock } = keys(email);
      await recordEvent(db, fail, now);
      const failures = await countRecentEvents(
        db,
        fail,
        perEmail.windowSeconds,
        now,
      );
      if (failures >= perEmail.limit) await recordEvent(db, lock, now);
    },
  };
}

/**
 * Login por e-mail e senha (AUT-FR-001). Devolve para onde a pessoa vai.
 * Bloqueio de tentativas em `passwordGuard` (AUT-FR-003).
 * `ctx.ipHash` é o IP já com hash (`hashIp(clientIp(headers))`).
 */
export async function signIn(
  deps: AuthDeps,
  input: SignInInput,
  ctx: { ipHash: string },
): Promise<{ redirectTo: string }> {
  const now = deps.now?.() ?? new Date();
  const guard = passwordGuard(deps.db, ctx.ipHash, now);
  await guard.assertNetworkAllowed();

  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) {
    await guard.recordFailure();
    throw invalidCredentials();
  }
  const { email, password, next } = parsed.data;

  await guard.assertEmailAllowed(email);
  const fail = async () => {
    await guard.recordFailure(email);
    return invalidCredentials();
  };

  const user = await deps.auth.signInWithPassword(email, password);
  if (!user) throw await fail();

  const profile = await loadProfile(deps.db, user.id);

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

  const profile = await loadProfile(deps.db, user.id);
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

/**
 * Abrir uma área pelo endereço também conta como "último painel usado" (AUT-FR-006).
 * Só grava papel que a conta tem e só quando muda (AUT-SEC-002).
 */
export async function rememberPanel(
  db: Db,
  session: Session,
  area: Area,
): Promise<void> {
  const areaRoles: readonly Role[] = AREAS[area];
  if (areaRoles.includes(session.activeRole)) return;
  const role = session.roles.find((r) => areaRoles.includes(r));
  if (!role) return;
  await db
    .update(profiles)
    .set({ lastPanel: role })
    .where(eq(profiles.id, session.userId));
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
 * Admin define uma senha temporária (AUT-FR-014): vale 24 h, obriga a troca no 1º acesso
 * e encerra todas as sessões abertas da conta.
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
  const id = userIdSchema.safeParse(targetUserId);
  if (!id.success) throw AppError.notFound();
  const [target] = await deps.db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.id, id.data));
  if (!target) throw AppError.notFound();

  const password = generateTemporaryPassword();
  // Perfil e auditoria juntos (API.md §2.7); se o provedor falhar, nada fica gravado.
  await deps.db.transaction(async (tx) => {
    await tx
      .update(profiles)
      .set({
        mustChangePassword: true,
        tempPasswordExpiresAt: new Date(now.getTime() + DAY_MS),
      })
      .where(eq(profiles.id, target.id));
    await logActivity(tx, {
      userId: admin.userId,
      action: "auth.temp_password_set",
      entity: "profile",
      entityId: target.id,
    });
    await deps.auth.adminUpdatePassword(target.id, password);
  });
  // Sessão aberta antes não pode criar a nova senha sem a temporária (AUT-FR-015).
  await deps.auth.adminSignOutAll(target.id);
  return { password };
}

/**
 * Cria a nova senha (AUT-FR-015). Só para quem entrou com senha temporária (é a única
 * ação liberada nesse estado, por isso não usa `authorize`). Encerra os outros aparelhos.
 */
export async function updatePassword(
  deps: AuthDeps,
  session: Session | null,
  input: unknown,
): Promise<{ redirectTo: string }> {
  if (!session) throw AppError.unauthorized();
  if (!session.mustChangePassword) throw AppError.forbidden();
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
  const parsed = accountEmailSchema.safeParse(email);
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

/**
 * Confirma a senha da própria conta antes de uma ação sensível (trocar a chave Pix,
 * CFG-SEC-005; trocar a senha, CFG-SEC-006). Usa o mesmo bloqueio do login: errar
 * aqui conta como errar no login. A conta vem só da sessão.
 */
export async function verifyOwnPassword(
  deps: AuthDeps,
  session: Session | null,
  password: string,
  ctx: { ipHash: string },
): Promise<void> {
  const s = authorize(session, ALL_ROLES);
  const now = deps.now?.() ?? new Date();
  const guard = passwordGuard(deps.db, ctx.ipHash, now);
  await guard.assertNetworkAllowed();

  const [profile] = await deps.db
    .select({ email: profiles.email })
    .from(profiles)
    .where(eq(profiles.id, s.userId));
  if (!profile) throw AppError.unauthorized();
  await guard.assertEmailAllowed(profile.email);

  if (!(await deps.auth.verifyPassword(profile.email, password))) {
    await guard.recordFailure(profile.email);
    throw AppError.validation([
      {
        field: "password",
        code: "wrong_password",
        message: "Senha incorreta.",
      },
    ]);
  }
}

/**
 * Troca da própria senha (CFG-FR-010): confere a atual com o bloqueio do login
 * (CFG-SEC-006), grava a nova, encerra os outros aparelhos e audita sem a senha.
 * Quem está com senha temporária usa a nova senha (AUT-FR-015): `authorize` recusa.
 */
export async function changePassword(
  deps: AuthDeps,
  session: Session | null,
  input: unknown,
  ctx: { ipHash: string },
): Promise<void> {
  const s = authorize(session, ALL_ROLES);
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success)
    throw AppError.validation(fieldErrorsFromZod(parsed.error));

  try {
    await verifyOwnPassword(deps, s, parsed.data.current, ctx);
  } catch (error) {
    // O erro da conferência é sobre a senha atual: vai para o campo "current".
    if (error instanceof AppError && error.type === "validation")
      throw AppError.validation([
        {
          field: "current",
          code: "wrong_password",
          message: "Senha atual incorreta.",
        },
      ]);
    throw error;
  }

  await deps.auth.updateOwnPassword(parsed.data.password);
  await deps.auth.signOut("others");
  await logActivity(deps.db, {
    userId: s.userId,
    action: "auth.password_changed",
    entity: "profile",
    entityId: s.userId,
  });
}

// Interface pública do domínio `auth` para os outros domínios (ARCHITECTURE §3).
export { authorizeTo } from "./permissions";
export { currentSession } from "./current";
