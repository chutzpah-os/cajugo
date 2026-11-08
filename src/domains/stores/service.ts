import { eq } from "drizzle-orm";
import { grantRole, type AuthDeps } from "@/domains/auth/service";
import {
  checkCode,
  getOrCreateCode,
  registerReferral,
} from "@/domains/referrals/service";
import { profiles, stores } from "@/platform/db/schema";
import { logActivity } from "@/platform/http/activity-log";
import { AppError, fieldErrorsFromZod } from "@/platform/http/errors";
import type { Session } from "@/platform/http/session";
import { registerStoreSchema } from "./schemas";
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

/**
 * Cadastro do lojista [5c] (STO-FR-003…007, 014): conta no provedor de login e, numa
 * transação, perfil + papel de lojista + loja `registered` com endereço reservado +
 * código pessoal + indicação + auditoria. Se a transação falhar, a conta é apagada:
 * nada fica pela metade. `ctx.ipHash` serve ao limite por rede (STO-SEC-002).
 */
export async function registerStore(
  deps: AuthDeps,
  _session: Session | null,
  input: unknown,
  _ctx: { ipHash: string },
): Promise<{ userId: string; storeId: string }> {
  const parsed = registerStoreSchema.safeParse(input);
  if (!parsed.success)
    throw AppError.validation(fieldErrorsFromZod(parsed.error));
  const data = parsed.data;
  const now = deps.now?.() ?? new Date();

  const code = await acceptedCode(deps, data.referralCode, data);
  if ((await checkSlug(deps.db, data.slug)).status !== "available") {
    const error = fieldError("slug", "taken", "Indisponível.");
    throw Object.assign(error, { status: 409 });
  }

  const user = await deps.auth.adminCreateUser(data.email, data.password);
  try {
    const storeId = await deps.db.transaction(async (tx) => {
      await tx.insert(profiles).values({
        id: user.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
      });
      await grantRole(tx, user.id, "store_owner", "public-signup");
      const [store] = await tx
        .insert(stores)
        .values({
          name: data.storeName,
          slug: data.slug,
          city: data.city,
          state: data.state,
          whatsapp: data.whatsapp,
          ownerId: user.id,
          slugReservedUntil: new Date(
            now.getTime() + SLUG_RESERVATION_DAYS * DAY_MS,
          ),
        })
        .returning({ id: stores.id });
      await tx
        .update(profiles)
        .set({ storeId: store.id })
        .where(eq(profiles.id, user.id));
      await getOrCreateCode(tx, user.id, data.name);
      if (code) await registerReferral(tx, code, store.id);
      await logActivity(tx, {
        userId: user.id,
        action: "store.registered",
        entity: "store",
        entityId: store.id,
      });
      return store.id;
    });
    return { userId: user.id, storeId };
  } catch (error) {
    await deps.auth.adminDeleteUser(user.id);
    throw error;
  }
}
