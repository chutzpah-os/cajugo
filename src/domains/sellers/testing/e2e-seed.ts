import { eq, inArray } from "drizzle-orm";
import {
  leads,
  partnerships,
  profiles,
  sellers,
  sellerVehicleClicks,
  stores,
} from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";

/** Vendedor ativo do e2e (conta `sellerReferrer`), parceiro da loja da vitrine. */
export const E2E_SELLER = {
  code: "E2EVENDE",
  name: "Vera E2E",
  cpf: "52998224725",
  pixKey: "vendedor-e2e@cajugo.test",
  /** Comissão da loja da vitrine: 2% (pontos-base). */
  commissionBps: 200,
} as const;

/**
 * Só testes: apaga os dados de vendedor das contas dadas (contas de teste e cadastros
 * dos e2e) e devolve as fotos do documento para apagar do Cloudinary.
 */
export async function removeSellersForTests(
  db: Db,
  profileIds: string[],
): Promise<string[]> {
  if (!profileIds.length) return [];
  const rows = await db
    .select({
      front: sellers.documentFrontPublicId,
      back: sellers.documentBackPublicId,
    })
    .from(sellers)
    .where(inArray(sellers.profileId, profileIds));
  await db.transaction(async (tx) => {
    await tx
      .update(leads)
      .set({ sellerId: null })
      .where(inArray(leads.sellerId, profileIds));
    await tx
      .delete(sellerVehicleClicks)
      .where(inArray(sellerVehicleClicks.sellerId, profileIds));
    await tx
      .delete(partnerships)
      .where(inArray(partnerships.sellerId, profileIds));
    await tx.delete(sellers).where(inArray(sellers.profileId, profileIds));
    await tx
      .update(profiles)
      .set({ cpf: null, pixKey: null, pixKeyType: null })
      .where(inArray(profiles.id, profileIds));
  });
  return rows.flatMap((r) => [r.front, r.back]).filter((x): x is string => !!x);
}

/** Só testes: o vendedor ativo do e2e, parceiro da loja da vitrine, com comissão de 2%. */
export async function seedSellers(
  db: Db,
  ids: { sellerId: string; storeId: string },
) {
  const S = E2E_SELLER;
  await db
    .update(profiles)
    .set({
      name: S.name,
      phone: "5579999990011",
      cpf: S.cpf,
      pixKey: S.pixKey,
      pixKeyType: "email",
    })
    .where(eq(profiles.id, ids.sellerId));
  await db.insert(sellers).values({
    profileId: ids.sellerId,
    code: S.code,
    city: "Aracaju",
    status: "active",
    approvedAt: new Date(),
  });
  await db.insert(partnerships).values({
    sellerId: ids.sellerId,
    storeId: ids.storeId,
    origin: "request",
    status: "active",
  });
  await db
    .update(stores)
    .set({ commissionType: "pct", commissionValue: S.commissionBps })
    .where(eq(stores.id, ids.storeId));
}
