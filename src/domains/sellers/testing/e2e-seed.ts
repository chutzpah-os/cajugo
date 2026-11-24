import { eq, inArray } from "drizzle-orm";
import {
  leads,
  partnerships,
  profiles,
  sales,
  sellers,
  sellerVehicleClicks,
  stores,
  vehicles,
} from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";
import { E2E_SHOWCASE } from "@/domains/showcase/testing/e2e-seed";

/**
 * Vendedor ativo do e2e (conta `sellerReferrer`), parceiro da loja da vitrine; e um
 * segundo vendedor ativo (conta `temporary`) com pedido de parceria pendente (009).
 */
export const E2E_SELLER = {
  code: "E2EVENDE",
  name: "Vera E2E",
  cpf: "52998224725",
  pixKey: "vendedor-e2e@cajugo.test",
  /** Comissão da loja da vitrine: 2% (pontos-base). */
  commissionBps: 200,
  /** Vendedor com pedido pendente na loja da vitrine (009). */
  pendingName: "Tadeu E2E",
  pendingCode: "E2ETADEU",
  pendingCpf: "11144477735",
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
    // Vendas feitas pelos e2e com esses vendedores (009) e a marca no veículo.
    const sold = await tx
      .delete(sales)
      .where(inArray(sales.sellerId, profileIds))
      .returning({ id: sales.id });
    if (sold.length)
      await tx
        .update(vehicles)
        .set({ saleId: null })
        .where(
          inArray(
            vehicles.saleId,
            sold.map((x) => x.id),
          ),
        );
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

/** Só testes: o vendedor ativo do e2e, parceiro da loja da vitrine (que aceita vendedores), com comissão de 2%. */
export async function seedSellers(
  db: Db,
  ids: {
    sellerId: string;
    storeId: string;
    /** Dono da loja da vitrine: quem confirmou as vendas do extrato (008b). */
    ownerId: string;
    pendingSellerId: string;
    otherStoreIds: string[];
  },
  now: Date = new Date(),
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
    .set({
      commissionType: "pct",
      commissionValue: S.commissionBps,
      acceptsSellers: true,
    })
    .where(eq(stores.id, ids.storeId));
  await seedStatement(db, ids, now);
  await seedPendingRequest(db, ids);
}

/** Só testes: o segundo vendedor, com pedido pendente; e as outras lojas aceitando (009). */
export async function seedPendingRequest(
  db: Db,
  ids: { pendingSellerId: string; storeId: string; otherStoreIds: string[] },
) {
  const S = E2E_SELLER;
  await db
    .update(profiles)
    .set({
      name: S.pendingName,
      cpf: S.pendingCpf,
      pixKey: "tadeu-e2e@cajugo.test",
      pixKeyType: "email",
    })
    .where(eq(profiles.id, ids.pendingSellerId));
  await db.insert(sellers).values({
    profileId: ids.pendingSellerId,
    code: S.pendingCode,
    city: "Aracaju",
    status: "active",
    approvedAt: new Date(),
  });
  await db.insert(partnerships).values({
    sellerId: ids.pendingSellerId,
    storeId: ids.storeId,
    origin: "request",
  });
  if (ids.otherStoreIds.length)
    await db
      .update(stores)
      .set({ acceptsSellers: true })
      .where(inArray(stores.id, ids.otherStoreIds));
}

/**
 * Só testes: duas vendas da vendedora do e2e na loja da vitrine (008b): uma "Paga"
 * pela loja na venda (BMW X1, há 10 dias) e uma "A receber" (Citroën C3, ontem).
 */
async function seedStatement(
  db: Db,
  ids: { sellerId: string; storeId: string; ownerId: string },
  now: Date,
) {
  const DAY = 86_400_000;
  const S = E2E_SHOWCASE;
  for (const [vehicleId, status, days] of [
    [S.soldId, "paid", 10],
    [S.statementId, "to_receive", 1],
  ] as const) {
    const [sale] = await db
      .insert(sales)
      .values({
        vehicleId,
        storeId: ids.storeId,
        sellerId: ids.sellerId,
        attribution: "other_partner",
        finalPriceCents: 4_000_000,
        commissionCents: 80_000,
        commissionStatus: status,
        feeBps: 100,
        feeCents: 40_000,
        confirmedBy: ids.ownerId,
        createdAt: new Date(now.getTime() - days * DAY),
      })
      .returning({ id: sales.id });
    await db
      .update(vehicles)
      .set({ saleId: sale.id })
      .where(eq(vehicles.id, vehicleId));
  }
}
