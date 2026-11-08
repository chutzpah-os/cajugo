import { eq } from "drizzle-orm";
import { grantRole, type AuthDeps } from "@/domains/auth/service";
import {
  checkCode,
  getOrCreateCode,
  registerReferral,
} from "@/domains/referrals/service";
import { profiles, stores } from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";
import { logActivity } from "@/platform/http/activity-log";
import { consumeRateLimit, RATE_LIMITS } from "@/platform/http/rate-limit";
import { AppError, fieldErrorsFromZod } from "@/platform/http/errors";
import type { Session } from "@/platform/http/session";
import { addStoreSchema, registerStoreSchema } from "./schemas";
import { checkSlug } from "./slug";

const DAY_MS = 24 * 60 * 60 * 1000;
/** Endereço reservado sem 1º pagamento (PRD §5.1); liberação na spec 011. */
const SLUG_RESERVATION_DAYS = 7;

const fieldError = (field: string, code: string, message: string) =>
  AppError.validation([{ field, code, message }]);

/** Código de indicação digitado: válido ou erro no campo (STO-FR-007). */
async function acceptedCode(
  deps: AuthDeps,
  raw: string | undefined,
  applicant: { email: string; phone: string },
): Promise<string | null> {
  if (!raw) return null;
  const check = await checkCode(deps.db, raw, applicant);
  if (check.status === "not-found")
    throw fieldError("referralCode", "not_found", "Código não encontrado.");
  if (check.status === "self-referral")
    throw fieldError(
      "referralCode",
      "self_referral",
      "Não vale usar o próprio código.",
    );
  return check.code;
}

export type RegisterContext = {
  /** IP com hash, para o limite por rede (STO-SEC-002). */
  ipHash: string;
  /** Campo isca preenchido: robô (STO-SEC-002). */
  honeypotFilled?: boolean;
};

/** Limite de formulário público por rede: 5/min e 30/dia (SECURITY.md §6). */
async function assertSignupAllowed(
  deps: AuthDeps,
  ctx: RegisterContext,
  now: Date,
) {
  const key = `signup:ip:${ctx.ipHash}`;
  for (const rule of [RATE_LIMITS.publicForm, RATE_LIMITS.publicFormDaily]) {
    const { ok, retryAfterSeconds } = await consumeRateLimit(
      deps.db,
      `${key}:${rule.windowSeconds}`,
      rule,
      now,
    );
    if (!ok) throw AppError.tooManyRequests(retryAfterSeconds);
  }
  if (ctx.honeypotFilled)
    throw new AppError(
      "bad-request",
      "Não foi possível concluir o cadastro.",
      400,
    );
}

/**
 * Cadastro do lojista [5c] (STO-FR-003…007, 014, 015). Visitante: conta no provedor
 * de login e, numa transação, perfil + papel + loja `registered` com endereço reservado
 * + código pessoal + indicação + auditoria; se a transação falhar, a conta é apagada.
 * Conectado (cliente sem loja): cria só a loja e adiciona o papel de lojista.
 * Protegido por campo isca e limite por rede (STO-SEC-002).
 */
export async function registerStore(
  deps: AuthDeps,
  session: Session | null,
  input: unknown,
  ctx: RegisterContext,
): Promise<{ userId: string; storeId: string }> {
  const now = deps.now?.() ?? new Date();
  await assertSignupAllowed(deps, ctx, now);
  if (session) return addStoreToAccount(deps, session, input, now);

  const parsed = registerStoreSchema.safeParse(input);
  if (!parsed.success)
    throw AppError.validation(fieldErrorsFromZod(parsed.error));
  const data = parsed.data;

  const [existing] = await deps.db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.email, data.email));
  if (existing)
    throw fieldError(
      "email",
      "account_exists",
      "Se você já tem conta, entre para continuar.",
    );

  const code = await acceptedCode(deps, data.referralCode, data);
  await assertSlugAvailable(deps, data.slug);

  const user = await deps.auth.adminCreateUser(data.email, data.password);
  try {
    const storeId = await deps.db.transaction(async (tx) => {
      await tx.insert(profiles).values({
        id: user.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
      });
      return createStore(tx, user.id, data.name, data, code, now);
    });
    return { userId: user.id, storeId };
  } catch (error) {
    await deps.auth.adminDeleteUser(user.id);
    throw error;
  }
}

async function assertSlugAvailable(deps: AuthDeps, slug: string) {
  if ((await checkSlug(deps.db, slug)).status !== "available") {
    const error = fieldError("slug", "taken", "Indisponível.");
    throw Object.assign(error, { status: 409 });
  }
}

/** Loja + papel + código + indicação + auditoria, dentro da transação do chamador. */
async function createStore(
  tx: Db,
  userId: string,
  personName: string,
  data: {
    storeName: string;
    slug: string;
    city: string;
    state: string;
    whatsapp: string;
  },
  code: string | null,
  now: Date,
): Promise<string> {
  await grantRole(tx, userId, "store_owner", "public-signup");
  const [store] = await tx
    .insert(stores)
    .values({
      name: data.storeName,
      slug: data.slug,
      city: data.city,
      state: data.state,
      whatsapp: data.whatsapp,
      ownerId: userId,
      slugReservedUntil: new Date(
        now.getTime() + SLUG_RESERVATION_DAYS * DAY_MS,
      ),
    })
    .returning({ id: stores.id });
  await tx
    .update(profiles)
    .set({ storeId: store.id })
    .where(eq(profiles.id, userId));
  await getOrCreateCode(tx, userId, personName);
  if (code) await registerReferral(tx, code, store.id);
  await logActivity(tx, {
    userId,
    action: "store.registered",
    entity: "store",
    entityId: store.id,
  });
  return store.id;
}

/** Quem já tem conta (vendedor, indicador) abre a loja na mesma conta (STO-FR-015). */
async function addStoreToAccount(
  deps: AuthDeps,
  session: Session,
  input: unknown,
  now: Date,
): Promise<{ userId: string; storeId: string }> {
  if (session.roles.some((r) => r === "admin" || r === "support"))
    throw AppError.forbidden();
  if (
    session.storeId ||
    session.roles.some((r) => r === "store_owner" || r === "store_staff")
  )
    throw new AppError("conflict", "Sua conta já tem uma loja.", 409);
  const parsed = addStoreSchema.safeParse(input);
  if (!parsed.success)
    throw AppError.validation(fieldErrorsFromZod(parsed.error));
  const data = parsed.data;

  const [profile] = await deps.db
    .select({
      name: profiles.name,
      email: profiles.email,
      phone: profiles.phone,
    })
    .from(profiles)
    .where(eq(profiles.id, session.userId));
  if (!profile) throw AppError.unauthorized();
  const code = await acceptedCode(deps, data.referralCode, {
    email: profile.email,
    phone: profile.phone ?? "",
  });
  await assertSlugAvailable(deps, data.slug);

  const storeId = await deps.db.transaction((tx) =>
    createStore(tx, session.userId, profile.name, data, code, now),
  );
  return { userId: session.userId, storeId };
}
