import { and, arrayOverlaps, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { profiles } from "@/platform/db/schema";
import { logActivity } from "@/platform/http/activity-log";
import { AppError, fieldErrorsFromZod } from "@/platform/http/errors";
import type { Role, Session } from "@/platform/http/session";
import { ROLE_BADGE } from "./admin-users";
import { authorizeTo, can } from "./permissions";
import { grantRole, TEAM_ROLES } from "./roles";
import { generateTemporaryPassword, type AuthDeps } from "./service";

const DAY_MS = 24 * 60 * 60 * 1000;

export type TeamMember = {
  profileId: string;
  name: string;
  email: string;
  role: "admin" | "support";
  roleLabel: string;
  isSelf: boolean;
  canRemove: boolean;
};

const teamRoleOf = (roles: Role[]): "admin" | "support" =>
  roles.includes("admin") ? "admin" : "support";

/** Equipe CajuGo [4c] (ADM-FR-012): admins e suportes; Remover só para o admin. */
export async function teamView(
  deps: { db: AuthDeps["db"] },
  session: Session | null,
): Promise<{ members: TeamMember[]; canManage: boolean }> {
  const s = authorizeTo(session, "admin.read");
  const canManage = can(s, "team.manage");
  const rows = await deps.db
    .select({
      id: profiles.id,
      name: profiles.name,
      email: profiles.email,
      roles: profiles.roles,
    })
    .from(profiles)
    .where(arrayOverlaps(profiles.roles, [...TEAM_ROLES]))
    .orderBy(asc(profiles.name));
  const admins = rows.filter((r) => r.roles.includes("admin")).length;
  return {
    canManage,
    members: rows.map((r) => {
      const role = teamRoleOf(r.roles);
      const isSelf = r.id === s.userId;
      return {
        profileId: r.id,
        name: r.name,
        email: r.email,
        role,
        roleLabel: ROLE_BADGE[role],
        isSelf,
        canRemove: canManage && !isSelf && !(role === "admin" && admins <= 1),
      };
    }),
  };
}

const inviteSchema = z
  .object({
    name: z.string().trim().min(2, "Informe o nome.").max(80),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .pipe(z.email("Informe um e-mail válido."))
      .pipe(z.string().max(254)),
    role: z.enum(["admin", "support"], { error: "Escolha Admin ou Suporte." }),
  })
  .strict();

const emailError = (message: string) =>
  AppError.validation([{ field: "email", code: "account_exists", message }]);

/**
 * Convidar para a Equipe CajuGo (ADM-FR-012): conta nova com senha temporária (24 h,
 * troca no 1º login), devolvida uma única vez e nunca registrada (ADM-SEC-003).
 * Conta que já existe sem papel recebe o papel e segue com a própria senha; conta de
 * cliente (loja, vendedor, indicador) não entra na equipe (AUT-SEC-009). Só admin.
 */
export async function inviteTeamMember(
  deps: AuthDeps,
  session: Session | null,
  input: unknown,
): Promise<{ profileId: string; temporaryPassword: string | null }> {
  const admin = authorizeTo(session, "team.manage");
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success)
    throw AppError.validation(fieldErrorsFromZod(parsed.error));
  const { name, email, role } = parsed.data;
  const now = deps.now?.() ?? new Date();

  const [existing] = await deps.db
    .select({ id: profiles.id, roles: profiles.roles })
    .from(profiles)
    .where(eq(profiles.email, email));
  if (existing) {
    if (existing.roles.some((r) => TEAM_ROLES.includes(r)))
      throw emailError("Essa pessoa já está na equipe.");
    if (existing.roles.length)
      throw emailError(
        "Esse e-mail é de uma conta de cliente. Use outro e-mail.",
      );
    await deps.db.transaction(async (tx) => {
      await grantRole(tx, existing.id, role, "admin");
      await logInvite(tx, admin.userId, existing.id, role);
    });
    return { profileId: existing.id, temporaryPassword: null };
  }

  const temporaryPassword = generateTemporaryPassword();
  const user = await deps.auth.adminCreateUser(email, temporaryPassword);
  try {
    await deps.db.transaction(async (tx) => {
      await tx.insert(profiles).values({
        id: user.id,
        name,
        email,
        mustChangePassword: true,
        tempPasswordExpiresAt: new Date(now.getTime() + DAY_MS),
      });
      await grantRole(tx, user.id, role, "admin");
      await logInvite(tx, admin.userId, user.id, role);
    });
  } catch (error) {
    await deps.auth.adminDeleteUser(user.id);
    throw error;
  }
  return { profileId: user.id, temporaryPassword };
}

function logInvite(
  tx: AuthDeps["db"],
  by: string,
  profileId: string,
  role: string,
) {
  return logActivity(tx, {
    userId: by,
    action: "team.invited",
    entity: "profile",
    entityId: profileId,
    data: { role },
  });
}

/**
 * Remover da equipe (ADM-FR-012): a pessoa perde o papel e todas as sessões dela são
 * encerradas. Ninguém remove a si mesmo, e o último admin fica. Só admin.
 */
export async function removeTeamMember(
  deps: AuthDeps,
  session: Session | null,
  input: unknown,
): Promise<void> {
  const admin = authorizeTo(session, "team.manage");
  const id = z.object({ profileId: z.uuid() }).safeParse(input);
  if (!id.success) throw AppError.notFound();
  const { profileId } = id.data;
  if (profileId === admin.userId)
    throw new AppError("conflict", "Você não pode remover a si mesmo.", 409);

  await deps.db.transaction(async (tx) => {
    const [target] = await tx
      .select({ roles: profiles.roles })
      .from(profiles)
      .where(
        and(
          eq(profiles.id, profileId),
          arrayOverlaps(profiles.roles, [...TEAM_ROLES]),
        ),
      )
      .for("update");
    if (!target) throw AppError.notFound();
    if (target.roles.includes("admin")) {
      const [{ n }] = await tx
        .select({ n: sql<number>`count(*)::int` })
        .from(profiles)
        .where(arrayOverlaps(profiles.roles, ["admin"]));
      if (n <= 1)
        throw new AppError(
          "conflict",
          "O último admin não pode ser removido.",
          409,
        );
    }
    await tx
      .update(profiles)
      .set({
        roles: sql`array_remove(array_remove(${profiles.roles}, 'admin'::user_role), 'support'::user_role)`,
      })
      .where(eq(profiles.id, profileId));
    await logActivity(tx, {
      userId: admin.userId,
      action: "team.removed",
      entity: "profile",
      entityId: profileId,
    });
  });
  await deps.auth.adminSignOutAll(profileId);
}
