import { eq } from "drizzle-orm";
import { z } from "zod";
import { profiles } from "@/platform/db/schema";
import { logActivity } from "@/platform/http/activity-log";
import { AppError, fieldErrorsFromZod } from "@/platform/http/errors";
import { grantRole } from "./roles";
import { generateTemporaryPassword, type AuthDeps } from "./service";

const DAY_MS = 24 * 60 * 60 * 1000;

const createAdminSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("Informe um e-mail válido.")),
  name: z.string().trim().min(1).max(120).optional(),
});

/**
 * Cria uma conta de admin com senha temporária (AUT-SEC-009). Não há caminho no site:
 * só o script `pnpm admin:create`, rodado pelo dono com a chave secreta do Supabase.
 * A senha volta uma única vez e vale 24 h; no 1º acesso, a pessoa cria a própria.
 */
export async function createAdmin(
  deps: AuthDeps,
  input: { email: string; name?: string },
): Promise<{ userId: string; password: string }> {
  const parsed = createAdminSchema.safeParse(input);
  if (!parsed.success)
    throw AppError.validation(fieldErrorsFromZod(parsed.error));
  const { email } = parsed.data;
  const now = deps.now?.() ?? new Date();

  const [existing] = await deps.db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.email, email));
  if (existing)
    throw new AppError("conflict", "Já existe uma conta com esse e-mail", 409);

  const password = generateTemporaryPassword();
  const user = await deps.auth.adminCreateUser(email, password);
  // Perfil, papel e auditoria juntos (API.md §2.7).
  await deps.db.transaction(async (tx) => {
    await tx.insert(profiles).values({
      id: user.id,
      email,
      name: parsed.data.name ?? email.split("@")[0],
      mustChangePassword: true,
      tempPasswordExpiresAt: new Date(now.getTime() + DAY_MS),
    });
    await grantRole(tx, user.id, "admin", "admin");
    await logActivity(tx, {
      userId: null,
      action: "auth.admin_created",
      entity: "profile",
      entityId: user.id,
    });
  });
  return { userId: user.id, password };
}
