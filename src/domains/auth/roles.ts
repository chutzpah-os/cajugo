import { eq, sql } from "drizzle-orm";
import { profiles } from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";
import { AppError } from "@/platform/http/errors";
import type { Role } from "@/platform/http/session";

/** Papéis que um cadastro público pode dar (specs 003, 008, 010). */
const PUBLIC_SIGNUP_ROLES: readonly Role[] = [
  "store_owner",
  "seller",
  "referrer",
];
export const TEAM_ROLES: readonly Role[] = ["admin", "support"];

/**
 * Único caminho para dar papel a uma conta (AUT-SEC-002, AUT-SEC-009).
 * Cadastro público nunca dá papel de equipe; equipe e clientes nunca se misturam.
 * Quem chama já autorizou (`via: "admin"` só a partir de action com `authorizeTo`).
 */
export async function grantRole(
  db: Db,
  userId: string,
  role: Role,
  via: "public-signup" | "admin",
): Promise<void> {
  if (via === "public-signup" && !PUBLIC_SIGNUP_ROLES.includes(role))
    throw AppError.forbidden();

  const [profile] = await db
    .select({ roles: profiles.roles })
    .from(profiles)
    .where(eq(profiles.id, userId));
  if (!profile) throw AppError.notFound();
  if (profile.roles.includes(role)) return;

  const isTeam = (r: Role) => TEAM_ROLES.includes(r);
  if (profile.roles.some((r) => isTeam(r) !== isTeam(role)))
    throw AppError.forbidden();

  await db
    .update(profiles)
    .set({ roles: sql`array_append(${profiles.roles}, ${role}::user_role)` })
    .where(eq(profiles.id, userId));
}
