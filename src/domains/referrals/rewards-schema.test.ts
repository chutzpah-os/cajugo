import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import {
  invoices,
  notices,
  referralCodes,
  referralRewards,
  referrals,
} from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { storeOwner } from "@/domains/billing/testing/fixtures";

describe("recompensas do Caju Indica no banco", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    t = await createTestDb();
  });
  afterEach(() => t.close());

  it("[IND-NFR-003] uma recompensa por fatura; avisos do Caju Indica existem", async () => {
    // Arrange
    const ricardo = await storeOwner(t.db, "loja-r", "r@x.com");
    const nova = await storeOwner(t.db, "loja-n", "n@x.com");
    const [{ code }] = await t.db
      .select({ code: referralCodes.code })
      .from(referralCodes)
      .where(eq(referralCodes.profileId, ricardo.userId));
    const [ref] = await t.db
      .insert(referrals)
      .values({
        code,
        referrerId: ricardo.userId,
        referredStoreId: nova.storeId,
      })
      .returning();
    const [inv] = await t.db
      .insert(invoices)
      .values({
        storeId: nova.storeId,
        kind: "first",
        membershipCents: 10_000,
        totalCents: 10_000,
        dueAt: new Date(),
      })
      .returning();
    const reward = {
      referralId: ref.id,
      invoiceId: inv.id,
      beneficiaryId: ricardo.userId,
      target: "credit" as const,
      amountCents: 3_000,
    };

    // Act
    await t.db.insert(referralRewards).values(reward);
    for (const kind of ["referral_active", "referral_reward"] as const)
      await t.db
        .insert(notices)
        .values({ profileId: ricardo.userId, kind, data: {} });

    // Assert
    await expect(t.db.insert(referralRewards).values(reward)).rejects.toThrow();
    expect(await t.db.select().from(notices)).toHaveLength(2);
  });
});
