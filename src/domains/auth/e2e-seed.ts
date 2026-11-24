import { eq, inArray } from "drizzle-orm";
import type { Cloudinary } from "@/platform/cloudinary/cloudinary";
import {
  profiles,
  rateLimits,
  storeSlugRedirects,
  stores,
} from "@/platform/db/schema";
import { hashIp } from "@/platform/http/client-ip";
import type { Role } from "@/platform/http/session";
import { getOrCreateCode } from "@/domains/referrals/service";
import { restoreInitialSettings } from "@/domains/settings/service";
import { removeBillingForTests } from "@/domains/billing/service";
import { seedAlerts } from "@/domains/buyers/testing/e2e-seed";
import { seedLeads } from "@/domains/leads/testing/e2e-seed";
import { seedReports } from "@/domains/moderation/testing/e2e-seed";
import {
  removeSellersForTests,
  seedSellers,
} from "@/domains/sellers/testing/e2e-seed";
import {
  E2E_SHOWCASE,
  seedShowcase,
} from "@/domains/showcase/testing/e2e-seed";
import { removeVehiclesForTests } from "@/domains/vehicles/service";
import {
  e2eSignups,
  removeE2ESignups,
  resetStoreForTests,
} from "@/domains/stores/service";
import { seedBilling } from "@/domains/billing/testing/e2e-seed";
import { seedCancellation } from "@/domains/billing/testing/cancel-seed";
import { isCarPhoto } from "@/domains/showcase/testing/car-photos";
import { rewardReferrals } from "@/domains/billing/service";
import { seedReferrals } from "@/domains/referrals/testing/e2e-seed";
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
  admin: { email: "e2e-admin@cajugo.test", roles: ["admin"] },
  temporary: { email: "e2e-temporaria@cajugo.test", roles: ["seller"] },
  showcaseOwner: { email: "e2e-vitrine@cajugo.test", roles: ["store_owner"] },
  suspendedOwner: { email: "e2e-suspensa@cajugo.test", roles: ["store_owner"] },
  recifeOwner: { email: "e2e-recife@cajugo.test", roles: ["store_owner"] },
  billingOwner: { email: "e2e-fatura@cajugo.test", roles: ["store_owner"] },
  cancelOwner: { email: "e2e-cancela@cajugo.test", roles: ["store_owner"] },
  canceledOwner: { email: "e2e-cancelada@cajugo.test", roles: ["store_owner"] },
} as const satisfies Record<string, { email: string; roles: Role[] }>;

const E2E_STORE_SLUG = "e2e-loja";
const E2E_OLD_SLUG = "e2e-loja-antiga";
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Cria (ou deixa no estado inicial) as contas e a loja de teste. Pode rodar quantas
 * vezes quiser: a senha volta a `password`, o último painel é limpo, o bloqueio por
 * e-mail (AUT-FR-003) das contas de teste é zerado, a conta `temporary` volta a ter
 * senha temporária válida por 24 h, as regras (spec 002) voltam aos valores provisórios
 * com uma chave Pix de teste, e faturas, pagamentos e avisos dos e2e são apagados.
 */
/** Chave Pix de teste: o fluxo de pagamento (spec 004) precisa de chave pronta. */
export const E2E_PIX = {
  type: "email",
  key: "pix-e2e@cajugo.test",
  beneficiary: "CajuGo Testes",
  city: "Aracaju",
} as const;

export async function seedE2E(
  deps: AuthDeps & { cloudinary?: Cloudinary },
  password: string,
) {
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
    // Pelo dono, não pelo endereço: um e2e pode ter trocado o endereço.
    .where(eq(stores.ownerId, ids.owner));
  if (!store) {
    [store] = await deps.db
      .insert(stores)
      .values({
        name: "Loja E2E",
        slug: E2E_STORE_SLUG,
        city: "Aracaju",
        state: "SE",
        whatsapp: "557932110000",
        ownerId: ids.owner,
        status: "active",
        // Loja de teste nunca vai para a vitrine CajuGo.
        shareByDefault: false,
      })
      .returning({ id: stores.id });
  }
  await deps.db
    .update(stores)
    .set({ status: "active", whatsapp: "557932110000" })
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
      Object.values(E2E_ACCOUNTS).flatMap((a) => [
        `login:fail:email:${hashIp(a.email)}`,
        `login:lock:email:${hashIp(a.email)}`,
      ]),
    ),
  );

  // Regras alteradas por testes voltam ao provisório (spec 002), com a chave Pix de
  // teste (spec 004); só grava o que mudou.
  await restoreInitialSettings(deps.db, { pix: E2E_PIX });
  // Faturas, pagamentos e avisos das lojas e contas dos e2e (spec 004); os
  // comprovantes saem também do Cloudinary.
  const signups = await e2eSignups(deps.db);
  const receipts = await removeBillingForTests(deps.db, {
    ...signups,
    profileIds: [...signups.profileIds, ...Object.values(ids)],
  });
  for (const publicId of receipts)
    await deps.cloudinary?.destroy(publicId, "authenticated");
  // Veículos e fotos da loja de teste e das lojas dos e2e (spec 005).
  const photos = await removeVehiclesForTests(deps.db, [
    store.id,
    ...signups.storeIds,
  ]);
  // As fotos de carro dos testes são compartilhadas: nunca saem do Cloudinary (012).
  for (const publicId of photos)
    if (!isCarPhoto(publicId)) await deps.cloudinary?.destroy(publicId);
  // Vendedores das contas de teste e dos cadastros dos e2e (spec 008), com as fotos.
  const documents = await removeSellersForTests(deps.db, [
    ...signups.profileIds,
    ...Object.values(ids),
  ]);
  for (const publicId of documents)
    await deps.cloudinary?.destroy(publicId, "authenticated");
  // Lojas e contas criadas pelos e2e de cadastro (spec 003).
  await removeE2ESignups(deps);
  // Loja de teste no estado inicial (Minha loja e troca de endereço, spec 003).
  await resetStoreForTests(deps.db, store.id, E2E_STORE_SLUG);
  // Endereço antigo fixo, para o teste de status real no build de produção (spec 006).
  await deps.db.insert(storeSlugRedirects).values({
    oldSlug: E2E_OLD_SLUG,
    storeId: store.id,
    expiresAt: new Date(now.getTime() + 365 * DAY_MS),
  });
  // Código pessoal do lojista de teste, para o e2e do link /i/{codigo} (spec 003).
  await getOrCreateCode(deps.db, ids.owner, "Lojista E2E");
  // Veículos da vitrine, numa loja separada (spec 006).
  const showcase = await seedShowcase(
    deps.db,
    {
      active: ids.showcaseOwner,
      suspended: ids.suspendedOwner,
      recife: ids.recifeOwner,
    },
    now,
  );
  // "Avisar quando chegar": um alerta com veículo e um esperando (spec 006d).
  await seedAlerts(deps.db, now);
  // Leads da loja da vitrine: um por status, WhatsApp, Novo antigo e veículo excluído (007).
  await seedLeads(
    deps.db,
    { storeId: showcase.storeId, vehicleId: E2E_SHOWCASE.fullId },
    now,
  );
  // Uma denúncia aberta de um veículo da vitrine (007b).
  await seedReports(deps.db, E2E_SHOWCASE.reportedId, now);
  // Vendedor ativo, parceiro da loja da vitrine, com comissão de 2% (008).
  await seedSellers(
    deps.db,
    {
      sellerId: ids.sellerReferrer,
      storeId: showcase.storeId,
      ownerId: ids.showcaseOwner,
      pendingSellerId: ids.temporary,
      otherStoreIds: [showcase.recifeId],
    },
    now,
  );

  // Loja suspensa pelo ciclo de cobrança real, com a fatura de R$ 600 aberta (011).
  await seedBilling(deps.db, ids.billingOwner, now);
  // Cancelamento (011b): uma loja ativa para cancelar e desfazer e uma cancelada
  // pelo ciclo real.
  await seedCancellation(
    deps.db,
    { active: ids.cancelOwner, gone: ids.canceledOwner },
    now,
  );
  // Caju Indica (010): Recife indicada pelo lojista (crédito) e a suspensa pela
  // vendedora (saldo), cada uma com a 1ª paga.
  const [suspended] = await deps.db
    .select({ id: stores.id })
    .from(stores)
    .where(eq(stores.slug, E2E_SHOWCASE.suspendedSlug));
  await seedReferrals(
    deps.db,
    {
      ownerId: ids.owner,
      ownerStoreId: store.id,
      sellerId: ids.sellerReferrer,
      ownerReferredStoreId: showcase.recifeId,
      sellerReferredStoreId: suspended.id,
    },
    now,
    rewardReferrals,
  );

  return { ids, storeId: store.id };
}
