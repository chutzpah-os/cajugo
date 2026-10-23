import { eq } from "drizzle-orm";
import { profiles, stores } from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";
import { hashIp } from "@/platform/http/client-ip";
import { AppError } from "@/platform/http/errors";
import {
  consumeRateLimit,
  peekRateLimit,
  RATE_LIMITS,
} from "@/platform/http/rate-limit";
import { safeNext } from "@/platform/http/safe-next";
import type { AuthProvider } from "@/platform/supabase/auth-provider";
import { landingFor } from "./landing";
import { signInSchema, type SignInInput } from "./schemas";

export type AuthDeps = { db: Db; auth: AuthProvider; now?: () => Date };

/** Mesmo erro para e-mail inexistente, senha errada e temporária vencida (AUT-FR-002). */
function invalidCredentials() {
  return new AppError("invalid-credentials", "E-mail ou senha incorretos", 401);
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

  const tempExpired =
    profile?.mustChangePassword &&
    profile.tempPasswordExpiresAt !== null &&
    profile.tempPasswordExpiresAt <= now;
  if (!profile || tempExpired) {
    await deps.auth.signOut("local");
    throw await fail();
  }

  await deps.db
    .update(profiles)
    .set({ lastLoginAt: now, lastSeenAt: now })
    .where(eq(profiles.id, user.id));

  const [store] = profile.storeId
    ? await deps.db
        .select({ status: stores.status })
        .from(stores)
        .where(eq(stores.id, profile.storeId))
    : [];

  const landing = landingFor(profile, {
    lastPanel: profile.lastPanel,
    storeStatus: store?.status ?? null,
  });
  if (profile.mustChangePassword) return { redirectTo: landing };
  return { redirectTo: safeNext(next, landing) };
}
