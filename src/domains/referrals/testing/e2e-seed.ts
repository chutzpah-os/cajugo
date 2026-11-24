import { and, eq, inArray } from "drizzle-orm";
import {
  billingCredits,
  invoices,
  referralRewards,
  referrals,
} from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";
import { getOrCreateCode } from "../service";

/**
 * Indicações dos e2e (spec 010), sempre iguais: a loja de Recife indicada pelo lojista
 * de teste (1ª paga → R$ 30 de crédito na Loja E2E) e a loja suspensa da vitrine
 * indicada pela vendedora de teste (1ª paga → R$ 30 de saldo; aparece Pausada).
 */
export async function seedReferrals(
  db: Db,
  ids: {
    ownerId: string;
    ownerStoreId: string;
    sellerId: string;
    /** Loja indicada pelo lojista. */
    ownerReferredStoreId: string;
    /** Loja indicada pela vendedora. */
    sellerReferredStoreId: string;
  },
  now: Date,
  /** A recompensa real (billing → referrals), passada por quem chama. */
  reward: (tx: Db, invoiceIds: string[], now: Date) => Promise<void>,
) {
  const referred = [ids.ownerReferredStoreId, ids.sellerReferredStoreId];
  const old = await db
    .select({ id: referrals.id })
    .from(referrals)
    .where(inArray(referrals.referredStoreId, referred));
  if (old.length)
    await db.delete(referralRewards).where(
      inArray(
        referralRewards.referralId,
        old.map((r) => r.id),
      ),
    );
  await db
    .delete(billingCredits)
    .where(
      and(
        eq(billingCredits.storeId, ids.ownerStoreId),
        eq(billingCredits.kind, "referral"),
      ),
    );
  await db
    .delete(referrals)
    .where(inArray(referrals.referredStoreId, referred));
  await db.delete(invoices).where(inArray(invoices.storeId, referred));

  const ownerCode = await getOrCreateCode(db, ids.ownerId, "Lojista E2E");
  const sellerCode = await getOrCreateCode(db, ids.sellerId, "Vera E2E");
  const paidAt = new Date(now.getTime() - 5 * 86_400_000);
  for (const [code, referrerId, storeId] of [
    [ownerCode, ids.ownerId, ids.ownerReferredStoreId],
    [sellerCode, ids.sellerId, ids.sellerReferredStoreId],
  ] as const) {
    await db
      .insert(referrals)
      .values({ code, referrerId, referredStoreId: storeId });
    const [invoice] = await db
      .insert(invoices)
      .values({
        storeId,
        kind: "first",
        membershipCents: 10_000,
        totalCents: 10_000,
        dueAt: paidAt,
        status: "paid",
        paidAt,
      })
      .returning({ id: invoices.id });
    await reward(db, [invoice.id], paidAt);
  }
}
