import { eq } from "drizzle-orm";
import { z } from "zod";
import { grantRole, type AuthDeps } from "@/domains/auth/service";
import { brPhoneSchema } from "@/platform/br/phone";
import { profiles } from "@/platform/db/schema";
import { logActivity } from "@/platform/http/activity-log";
import { AppError, fieldErrorsFromZod } from "@/platform/http/errors";
import { withinPublicFormLimits } from "@/platform/http/rate-limit";
import type { Session } from "@/platform/http/session";

/** Cadastro rápido do indicador [9b] (IND-FR-004): CPF e Pix só no 1º resgate (010b). */
export const referrerSignupSchema = z
  .object({
    name: z.string().trim().min(2, "Informe seu nome.").max(80),
    phone: brPhoneSchema,
    email: z
      .string()
      .trim()
      .toLowerCase()
      .pipe(z.email("Informe um e-mail válido."))
      .pipe(z.string().max(254)),
    password: z
      .string()
      .min(8, "Use pelo menos 8 caracteres.")
      .max(200, "Use no máximo 200 caracteres."),
    terms: z.literal(true, { error: "Aceite os termos para continuar." }),
  })
  .strict();

const termsOnly = z
  .object({
    terms: z.literal(true, { error: "Aceite os termos para continuar." }),
  })
  .strict();

function parse<T>(schema: z.ZodType<T>, raw: unknown): T {
  const parsed = schema.safeParse(raw);
  if (!parsed.success)
    throw AppError.validation(fieldErrorsFromZod(parsed.error));
  return parsed.data;
}

/**
 * Cadastro do indicador [9b] (IND-FR-004): visitante cria a conta (perfil e papel numa
 * transação; se falhar, a conta no provedor é apagada); quem já tem conta só ganha o
 * papel. Campo isca: sucesso falso; limite por rede (SECURITY.md §7).
 */
export async function registerReferrer(
  deps: AuthDeps,
  session: Session | null,
  input: unknown,
  ctx: { ipHash: string; honeypotFilled?: boolean },
): Promise<{ userId: string | null }> {
  const now = deps.now?.() ?? new Date();
  if (
    !(await withinPublicFormLimits(deps.db, "referrer-signup", ctx.ipHash, now))
  )
    throw AppError.tooManyRequests(60);
  if (ctx.honeypotFilled) return { userId: null };

  if (session) {
    if (session.roles.some((r) => r === "admin" || r === "support"))
      throw AppError.forbidden();
    parse(termsOnly, input);
    if (!session.roles.includes("referrer"))
      await deps.db.transaction(async (tx) => {
        await grantRole(tx, session.userId, "referrer", "public-signup");
        await logActivity(tx, {
          userId: session.userId,
          action: "referrer.registered",
          entity: "profile",
          entityId: session.userId,
        });
      });
    return { userId: session.userId };
  }

  const data = parse(referrerSignupSchema, input);
  const [existing] = await deps.db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.email, data.email));
  if (existing)
    throw AppError.validation([
      {
        field: "email",
        code: "account_exists",
        message: "Se você já tem conta, entre para continuar.",
      },
    ]);
  const user = await deps.auth.adminCreateUser(data.email, data.password);
  try {
    await deps.db.transaction(async (tx) => {
      await tx.insert(profiles).values({
        id: user.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
      });
      await grantRole(tx, user.id, "referrer", "public-signup");
      await logActivity(tx, {
        userId: user.id,
        action: "referrer.registered",
        entity: "profile",
        entityId: user.id,
      });
    });
    return { userId: user.id };
  } catch (error) {
    await deps.auth.adminDeleteUser(user.id);
    throw error;
  }
}
