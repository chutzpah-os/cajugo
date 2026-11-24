import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { notify } from "@/domains/notices/service";
import { getSettings } from "@/domains/settings/service";
import {
  invoices,
  referralRewards,
  referrals,
  stores,
} from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";
import { logActivity } from "@/platform/http/activity-log";

/** Lojas que pagam: o crédito de quem indicou vai para a fatura de uma delas (D2). */
const BILLED = ["active", "past_due", "suspended"] as const;

/** Crédito que a `billing` lança para o lojista que indicou (D3). */
export type ReferralCredit = {
  storeId: string;
  amountCents: number;
  rewardId: string;
};

/**
 * Faturas que viraram pagas (spec 010), dentro da transação de quem pagou: cada uma da
 * loja indicada rende uma vez se está entre as N primeiras da loja (pela ordem de
 * vencimento), mesmo paga com atraso (IND-FR-006..008, IND-NFR-003). O valor é o
 * percentual vigente sobre a mensalidade da fatura (IND-SEC-005). Quem indicou e tem
 * loja ganha crédito (devolvido aqui para a `billing` lançar); os outros, saldo.
 */
export async function rewardPaidInvoices(
  tx: Db,
  invoiceIds: string[],
  now: Date,
): Promise<ReferralCredit[]> {
  if (!invoiceIds.length) return [];
  const paid = await tx
    .select()
    .from(invoices)
    .where(and(inArray(invoices.id, invoiceIds), eq(invoices.status, "paid")))
    .orderBy(asc(invoices.dueAt));
  if (!paid.length) return [];
  const settings = await getSettings(tx, now);
  const months = settings.referral_months;
  const credits: ReferralCredit[] = [];

  for (const invoice of paid) {
    const [ref] = await tx
      .select({
        id: referrals.id,
        referrerId: referrals.referrerId,
        status: referrals.status,
        monthsPaid: referrals.monthsPaid,
        storeName: stores.name,
      })
      .from(referrals)
      .innerJoin(stores, eq(stores.id, referrals.referredStoreId))
      .where(eq(referrals.referredStoreId, invoice.storeId))
      .for("update", { of: referrals });
    if (!ref?.referrerId || ref.status === "rejected") continue;

    // Posição desta fatura entre as da loja (a 1ª é a posição 0).
    const before = await tx
      .select({ id: invoices.id, dueAt: invoices.dueAt })
      .from(invoices)
      .where(
        and(
          eq(invoices.storeId, invoice.storeId),
          ne(invoices.status, "canceled"),
        ),
      );
    const position = before.filter(
      (i) =>
        i.dueAt < invoice.dueAt ||
        (i.dueAt.getTime() === invoice.dueAt.getTime() && i.id < invoice.id),
    ).length;
    if (position >= months) continue;

    const [own] = await tx
      .select({ id: stores.id })
      .from(stores)
      .where(
        and(
          eq(stores.ownerId, ref.referrerId),
          inArray(stores.status, [...BILLED]),
        ),
      )
      .limit(1);
    const amountCents = Math.floor(
      (invoice.membershipCents * settings.referral_pct_bps) / 10_000,
    );
    const target = own ? "credit" : "balance";
    const [reward] = await tx
      .insert(referralRewards)
      .values({
        referralId: ref.id,
        invoiceId: invoice.id,
        beneficiaryId: ref.referrerId,
        target,
        amountCents,
        createdAt: now,
      })
      .onConflictDoNothing()
      .returning({ id: referralRewards.id });
    if (!reward) continue;

    const monthsPaid = ref.monthsPaid + 1;
    await tx
      .update(referrals)
      .set({ monthsPaid, status: monthsPaid >= months ? "ended" : "active" })
      .where(eq(referrals.id, ref.id));
    const first = ref.monthsPaid === 0;
    await notify(
      tx,
      ref.referrerId,
      first
        ? { kind: "referral_active", store: ref.storeName, amountCents }
        : {
            kind: "referral_reward",
            store: ref.storeName,
            amountCents,
            target,
          },
      now,
    );
    if (first)
      await logActivity(tx, {
        userId: null,
        action: "referral.activated",
        entity: "referral",
        entityId: ref.id,
      });
    await logActivity(tx, {
      userId: null,
      action: "referral.rewarded",
      entity: "referral",
      entityId: ref.id,
      data: { invoiceId: invoice.id, amountCents, target },
    });
    if (own)
      credits.push({ storeId: own.id, amountCents, rewardId: reward.id });
  }
  return credits;
}
