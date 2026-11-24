import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import {
  activityLog,
  invoices,
  notices,
  profiles,
  referralCodes,
  referralRewards,
  referrals,
  settingValues,
  stores,
} from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { uuidv7 } from "@/platform/db/uuid";
import { storeOwner } from "@/domains/billing/testing/fixtures";
import { rewardPaidInvoices } from "./service";

const NOW = new Date("2026-11-23T12:00:00Z");
const month = (m: number) => new Date(Date.UTC(2026, 10 + m, 10, 3));

describe("recompensa do Caju Indica", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    t = await createTestDb();
  });
  afterEach(() => t.close());

  /** Indicadora Júlia (sem loja) e a Loja Boa indicada por ela. */
  async function setup(
    opts: { referrerIsOwner?: boolean; rejected?: boolean } = {},
  ) {
    let referrerId: string;
    let referrerStoreId: string | null = null;
    if (opts.referrerIsOwner) {
      const r = await storeOwner(t.db, "loja-ricardo", "r@x.com");
      await t.db
        .update(stores)
        .set({ status: "active" })
        .where(eq(stores.id, r.storeId));
      referrerId = r.userId;
      referrerStoreId = r.storeId;
    } else {
      referrerId = uuidv7();
      await t.db.insert(profiles).values({
        id: referrerId,
        email: "j@x.com",
        name: "Júlia",
        roles: ["referrer"],
      });
    }
    await t.db
      .insert(referralCodes)
      .values({
        code: "JULIA10",
        profileId: opts.referrerIsOwner ? null : referrerId,
        campaignName: opts.referrerIsOwner ? "x" : null,
      })
      .onConflictDoNothing();
    const [{ code }] = await t.db
      .select({ code: referralCodes.code })
      .from(referralCodes)
      .where(
        opts.referrerIsOwner
          ? eq(referralCodes.profileId, referrerId)
          : eq(referralCodes.code, "JULIA10"),
      );
    const boa = await storeOwner(t.db, "loja-boa", "b@x.com");
    const [ref] = await t.db
      .insert(referrals)
      .values({
        code,
        referrerId,
        referredStoreId: boa.storeId,
        ...(opts.rejected
          ? { status: "rejected" as const, rejectReason: "self_referral" }
          : {}),
      })
      .returning();
    return { referrerId, referrerStoreId, boa, ref };
  }

  async function paid(
    storeId: string,
    m: number,
    kind: "first" | "monthly" = m === 0 ? "first" : "monthly",
    membershipCents = 10_000,
  ) {
    const [inv] = await t.db
      .insert(invoices)
      .values({
        storeId,
        kind,
        period:
          kind === "monthly" ? `2026-${String(11 + m).padStart(2, "0")}` : null,
        membershipCents,
        totalCents: membershipCents,
        dueAt: month(m),
        status: "paid",
        paidAt: NOW,
      })
      .returning();
    return inv.id;
  }

  const rewards = () => t.db.select().from(referralRewards);

  it("[IND-FR-006] [IND-SEC-006] a 1ª paga ativa a indicação e rende 30% da mensalidade, com aviso e registro", async () => {
    // Arrange
    const { referrerId, boa, ref } = await setup();
    const first = await paid(boa.storeId, 0);

    // Act
    const credits = await rewardPaidInvoices(t.db, [first], NOW);

    // Assert
    expect(credits).toEqual([]);
    expect(await rewards()).toEqual([
      expect.objectContaining({
        referralId: ref.id,
        invoiceId: first,
        beneficiaryId: referrerId,
        target: "balance",
        amountCents: 3_000,
      }),
    ]);
    const [row] = await t.db.select().from(referrals);
    expect(row).toMatchObject({ status: "active", monthsPaid: 1 });
    const [notice] = await t.db
      .select()
      .from(notices)
      .where(eq(notices.profileId, referrerId));
    expect(notice).toMatchObject({
      kind: "referral_active",
      data: { store: "Loja loja-boa", amountCents: 3_000 },
    });
    const actions = (await t.db.select().from(activityLog)).map(
      (l) => l.action,
    );
    expect(actions).toEqual(
      expect.arrayContaining(["referral.activated", "referral.rewarded"]),
    );
  });

  it("[IND-FR-007] rendem só as 3 primeiras faturas da loja; depois, Encerrada", async () => {
    const { boa } = await setup();
    const ids = [];
    for (let m = 0; m < 4; m++) ids.push(await paid(boa.storeId, m));

    for (const id of ids) await rewardPaidInvoices(t.db, [id], NOW);

    expect((await rewards()).map((r) => r.invoiceId)).toEqual(ids.slice(0, 3));
    const [row] = await t.db.select().from(referrals);
    expect(row).toMatchObject({ status: "ended", monthsPaid: 3 });
  });

  it("[IND-FR-007] [IND-FR-008] a mensalidade atrasada paga depois rende, pela posição dela", async () => {
    const { boa } = await setup();
    const first = await paid(boa.storeId, 0);
    // Novembro e dezembro: dezembro paga antes de novembro.
    const dec = await paid(boa.storeId, 2);
    const nov = await paid(boa.storeId, 1);
    const jan = await paid(boa.storeId, 3);

    await rewardPaidInvoices(t.db, [first, dec], NOW);
    await rewardPaidInvoices(t.db, [jan], NOW);
    await rewardPaidInvoices(t.db, [nov], NOW);

    expect((await rewards()).map((r) => r.invoiceId).sort()).toEqual(
      [first, dec, nov].sort(),
    );
  });

  it("[IND-NFR-003] repetir a mesma fatura não rende de novo", async () => {
    const { boa } = await setup();
    const first = await paid(boa.storeId, 0);

    await rewardPaidInvoices(t.db, [first], NOW);
    await rewardPaidInvoices(t.db, [first], NOW);

    expect(await rewards()).toHaveLength(1);
    expect((await t.db.select().from(referrals))[0].monthsPaid).toBe(1);
  });

  it("[IND-FR-017] indicação não válida e link de campanha não rendem", async () => {
    const { boa } = await setup({ rejected: true });
    const first = await paid(boa.storeId, 0);
    const camp = await storeOwner(t.db, "loja-camp", "c@x.com");
    await t.db
      .insert(referralCodes)
      .values({ code: "FEIRAO", campaignName: "Feirão" });
    await t.db.insert(referrals).values({
      code: "FEIRAO",
      referrerId: null,
      referredStoreId: camp.storeId,
    });
    const campFirst = await paid(camp.storeId, 0);

    await rewardPaidInvoices(t.db, [first, campFirst], NOW);

    expect(await rewards()).toHaveLength(0);
  });

  it("[IND-SEC-005] valor pelo percentual vigente na confirmação, sobre a mensalidade da fatura", async () => {
    const { boa } = await setup();
    const first = await paid(boa.storeId, 0);
    await rewardPaidInvoices(t.db, [first], NOW);
    await t.db.insert(settingValues).values({
      key: "referral_pct_bps",
      value: 2000,
      validFrom: new Date("2026-11-24T00:00:00Z"),
    });
    const nov = await paid(boa.storeId, 1, "monthly", 12_000);

    await rewardPaidInvoices(t.db, [nov], new Date("2026-11-25T12:00:00Z"));

    expect((await rewards()).map((r) => r.amountCents)).toEqual([3_000, 2_400]);
  });

  it("[IND-FR-009] quem indicou é lojista: a recompensa volta como crédito para a loja dele", async () => {
    const { referrerStoreId, boa } = await setup({ referrerIsOwner: true });
    const first = await paid(boa.storeId, 0);

    const credits = await rewardPaidInvoices(t.db, [first], NOW);

    const [reward] = await rewards();
    expect(reward.target).toBe("credit");
    expect(credits).toEqual([
      { storeId: referrerStoreId, amountCents: 3_000, rewardId: reward.id },
    ]);
  });
});
