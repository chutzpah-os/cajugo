import { and, desc, eq, ilike, lt, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { profiles, stores } from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";
import type { Role, Session } from "@/platform/http/session";
import { authorizeTo } from "./permissions";

/** Selos de papel da aba Usuários [1d] (ADM-FR-007), na ordem do design. */
export const ROLE_BADGE: Record<Role, string> = {
  store_owner: "Lojista",
  store_staff: "Usuário da loja",
  seller: "Vendedor",
  referrer: "Indicador",
  admin: "Admin",
  support: "Suporte",
};
const ROLE_ORDER: Role[] = [
  "store_owner",
  "store_staff",
  "seller",
  "referrer",
  "admin",
  "support",
];

export const USERS_PAGE_SIZE = 20;

const querySchema = z.object({
  q: z.string().trim().max(80).optional().catch(undefined),
  depois: z.uuid().optional().catch(undefined),
});

export type AdminUserItem = {
  profileId: string;
  name: string;
  /** A loja (lojista e usuário da loja) ou o e-mail. */
  info: string;
  badges: string[];
  /** Onde o toque leva: a loja [6g] ou a tela do papel ([7h] para vendedor). */
  href: string | null;
};

const like = (q: string) => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

function destination(roles: Role[], storeId: string | null, email: string) {
  if (
    storeId &&
    (roles.includes("store_owner") || roles.includes("store_staff"))
  )
    return `/admin/lojas/${storeId}`;
  if (roles.includes("seller"))
    return `/admin/vendedores?q=${encodeURIComponent(email)}`;
  return null;
}

/**
 * Aba Usuários [1d] do admin (ADM-FR-007): busca por nome ou e-mail, selos de papel e
 * o destino de cada conta, 20 por vez (das mais novas às mais antigas). Admin e
 * suporte (ADM-SEC-001). Contas sem papel (só cadastro incompleto) não aparecem.
 */
export async function usersAdmin(
  db: Db,
  session: Session | null,
  raw: unknown,
): Promise<{ q: string; items: AdminUserItem[]; next: string | null }> {
  authorizeTo(session, "admin.read");
  const { q, depois } = querySchema.parse(raw ?? {});
  const where: (SQL | undefined)[] = [sql`cardinality(${profiles.roles}) > 0`];
  if (q)
    where.push(
      or(ilike(profiles.name, like(q)), ilike(profiles.email, like(q))),
    );
  if (depois) where.push(lt(profiles.id, depois));

  const rows = await db
    .select({
      id: profiles.id,
      name: profiles.name,
      email: profiles.email,
      roles: profiles.roles,
      storeId: profiles.storeId,
      store: stores.name,
    })
    .from(profiles)
    .leftJoin(stores, eq(stores.id, profiles.storeId))
    .where(and(...where))
    .orderBy(desc(profiles.id))
    .limit(USERS_PAGE_SIZE + 1);

  const page = rows.slice(0, USERS_PAGE_SIZE);
  return {
    q: q ?? "",
    items: page.map((r) => ({
      profileId: r.id,
      name: r.name,
      info: r.store ?? r.email,
      badges: ROLE_ORDER.filter((role) => r.roles.includes(role)).map(
        (role) => ROLE_BADGE[role],
      ),
      href: destination(r.roles, r.storeId, r.email),
    })),
    next: rows.length > USERS_PAGE_SIZE ? (page.at(-1)?.id ?? null) : null,
  };
}
