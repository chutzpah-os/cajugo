import { eq, inArray } from "drizzle-orm";
import { profiles, rateLimits, stores } from "@/platform/db/schema";
import { hashIp } from "@/platform/http/client-ip";
import type { Role } from "@/platform/http/session";
import { grantRole } from "./roles";
import type { AuthDeps } from "./service";

/** Contas dos testes ponta a ponta (spec 001 › T019). Só no staging, nunca na produção. */
export const E2E_ACCOUNTS = {
  owner: { email: "e2e-lojista@cajugo.test", roles: ["store_owner"] },
  staff: { email: "e2e-usuario-loja@cajugo.test", roles: ["store_staff"] },
  sellerReferrer: {
    email: "e2e-vendedor@cajugo.test",
    roles: ["seller", "referrer"],
  },
  referrer: { email: "e2e-indicador@cajugo.test", roles: ["referrer"] },
  support: { email: "e2e-suporte@cajugo.test", roles: ["support"] },
  temporary: { email: "e2e-temporaria@cajugo.test", roles: ["seller"] },
} as const satisfies Record<string, { email: string; roles: Role[] }>;

const E2E_STORE_SLUG = "e2e-loja";
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Cria (ou deixa no estado inicial) as contas e a loja de teste. Pode rodar quantas
 * vezes quiser: a senha volta a `password`, o último painel é limpo, o bloqueio por
 * e-mail (AUT-FR-003) das contas de teste é zerado e a conta `temporary` volta a ter
 * senha temporária válida por 24 h.
 */
export async function seedE2E(deps: AuthDeps, password: string) {
  const now = deps.now?.() ?? new Date();
  const ids = {} as Record<keyof typeof E2E_ACCOUNTS, string>;

  for (const [key, account] of Object.entries(E2E_ACCOUNTS) as [
    keyof typeof E2E_ACCOUNTS,
    (typeof E2E_ACCOUNTS)[keyof typeof E2E_ACCOUNTS],
  ][]) {
    const [existing] = await deps.db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.email, account.email));
    let id = existing?.id;
    if (id) {
      await deps.auth.adminUpdatePassword(id, password);
    } else {
      id = (await deps.auth.adminCreateUser(account.email, password)).id;
      await deps.db
        .insert(profiles)
        .values({ id, email: account.email, name: `E2E ${key}` });
    }
    const temporary = key === "temporary";
    await deps.db
      .update(profiles)
      .set({
        lastPanel: null,
        mustChangePassword: temporary,
        tempPasswordExpiresAt: temporary
          ? new Date(now.getTime() + DAY_MS)
          : null,
      })
      .where(eq(profiles.id, id));
    for (const role of account.roles)
      await grantRole(deps.db, id, role, "admin");
    ids[key] = id;
  }

  let [store] = await deps.db
    .select({ id: stores.id })
    .from(stores)
    .where(eq(stores.slug, E2E_STORE_SLUG));
  if (!store) {
    [store] = await deps.db
      .insert(stores)
      .values({
        name: "Loja E2E",
        slug: E2E_STORE_SLUG,
        city: "Aracaju",
        state: "SE",
        whatsapp: "5579000000000",
        ownerId: ids.owner,
        status: "active",
        // Loja de teste nunca vai para a vitrine CajuGo.
        shareByDefault: false,
      })
      .returning({ id: stores.id });
  }
  await deps.db
    .update(stores)
    .set({ status: "active" })
    .where(eq(stores.id, store.id));
  for (const key of ["owner", "staff"] as const)
    await deps.db
      .update(profiles)
      .set({ storeId: store.id })
      .where(eq(profiles.id, ids[key]));

  // Falhas de login dos testes anteriores não podem bloquear a próxima rodada.
  await deps.db.delete(rateLimits).where(
    inArray(
      rateLimits.key,
      Object.values(E2E_ACCOUNTS).map((a) => `login:email:${hashIp(a.email)}`),
    ),
  );

  return { ids, storeId: store.id };
}
