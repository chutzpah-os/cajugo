import { eq, inArray, or } from "drizzle-orm";
import { notices, profiles, stores } from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";
import type { Role } from "@/platform/http/session";

/**
 * Contas da loja arquivada (011b, CAN-FR-007, CAN-SEC-003): o dono e os usuários da
 * loja. Quem não tem outro papel tem a conta apagada (no provedor de login, por quem
 * chama, e aqui o perfil fica anônimo: as faturas e os pagamentos apontam para ele);
 * quem é também vendedor ou indicador só perde o papel da loja.
 */

const STORE_ROLES: readonly Role[] = ["store_owner", "store_staff"];

const otherRoles = (roles: Role[]) =>
  roles.filter((r) => !STORE_ROLES.includes(r));

async function accountsOf(db: Db, storeId: string) {
  const [store] = await db
    .select({ ownerId: stores.ownerId })
    .from(stores)
    .where(eq(stores.id, storeId));
  return db
    .select({ id: profiles.id, roles: profiles.roles })
    .from(profiles)
    .where(
      store
        ? or(eq(profiles.storeId, storeId), eq(profiles.id, store.ownerId))
        : eq(profiles.storeId, storeId),
    );
}

/** Contas a apagar no provedor de login (sem outro papel). */
export async function storeAccountsToDelete(
  db: Db,
  storeId: string,
): Promise<string[]> {
  return (await accountsOf(db, storeId))
    .filter((p) => !otherRoles(p.roles).length)
    .map((p) => p.id);
}

/** Na transação do arquivamento: perfis anônimos ou sem o papel da loja. */
export async function removeStoreAccounts(
  tx: Db,
  storeId: string,
): Promise<{ deleted: number; rolesRemoved: number }> {
  const accounts = await accountsOf(tx, storeId);
  const gone = accounts.filter((p) => !otherRoles(p.roles).length);
  for (const p of accounts.filter((a) => otherRoles(a.roles).length))
    await tx
      .update(profiles)
      .set({ roles: otherRoles(p.roles), storeId: null, lastPanel: null })
      .where(eq(profiles.id, p.id));
  if (gone.length) {
    const ids = gone.map((p) => p.id);
    await tx.delete(notices).where(inArray(notices.profileId, ids));
    for (const id of ids)
      await tx
        .update(profiles)
        .set({
          name: "Conta apagada",
          email: `apagada-${id}@conta-apagada.invalid`,
          phone: null,
          cpf: null,
          pixKey: null,
          pixKeyType: null,
          roles: [],
          storeId: null,
          lastPanel: null,
          notifyEmail: false,
          mustChangePassword: false,
          tempPasswordExpiresAt: null,
        })
        .where(eq(profiles.id, id));
  }
  return { deleted: gone.length, rolesRemoved: accounts.length - gone.length };
}
