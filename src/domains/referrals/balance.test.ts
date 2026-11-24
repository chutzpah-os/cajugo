import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  invoices,
  profiles,
  referralCodes,
  referralRewards,
  referrals,
} from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { uuidv7 } from "@/platform/db/uuid";
import type { Session } from "@/platform/http/session";
import { storeOwner } from "@/domains/billing/testing/fixtures";
import { balanceView } from "./service";

describe("saldo do indicador [9d]", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    t = await createTestDb();
  });
  afterEach(() => t.close());

  async function person(code: string): Promise<Session> {
    const id = uuidv7();
    await t.db
      .insert(profiles)
      .values({ id, email: `${id}@x.com`, name: code, roles: ["referrer"] });
    await t.db.insert(referralCodes).values({ code, profileId: id });
    return {
      userId: id,
      roles: ["referrer"],
      activeRole: "referrer",
      storeId: null,
      mustChangePassword: false,
    };
  }

  async function reward(
    who: Session,
    code: string,
    slug: string,
    cents: number,
    at: Date,
  ) {
    const s = await storeOwner(t.db, slug, `${slug}@x.com`);
    const [ref] = await t.db
      .insert(referrals)
      .values({ code, referrerId: who.userId, referredStoreId: s.storeId })
      .returning();
    const [inv] = await t.db
      .insert(invoices)
      .values({
        storeId: s.storeId,
        kind: "first",
        membershipCents: 10_000,
        totalCents: 10_000,
        dueAt: at,
        status: "paid",
      })
      .returning();
    await t.db.insert(referralRewards).values({
      referralId: ref.id,
      invoiceId: inv.id,
      beneficiaryId: who.userId,
      target: "balance",
      amountCents: cents,
      createdAt: at,
    });
  }

  it("[IND-FR-010] saldo, mínimo, progresso e movimentações (mais recente primeiro)", async () => {
    // Arrange
    const julia = await person("JULIA10");
    await reward(
      julia,
      "JULIA10",
      "boa",
      3_000,
      new Date("2026-11-01T12:00:00Z"),
    );
    await reward(
      julia,
      "JULIA10",
      "nova",
      1_500,
      new Date("2026-11-10T12:00:00Z"),
    );

    // Act
    const view = await balanceView(t.db, julia);

    // Assert
    expect(view).toMatchObject({
      balanceCents: 4_500,
      minCents: 5_000,
      progress: 0.9,
    });
    expect(view.movements).toEqual([
      {
        store: "Loja nova",
        amountCents: 1_500,
        date: new Date("2026-11-10T12:00:00Z"),
      },
      {
        store: "Loja boa",
        amountCents: 3_000,
        date: new Date("2026-11-01T12:00:00Z"),
      },
    ]);
  });

  it("[IND-SEC-001] o saldo de B não aparece para A", async () => {
    const julia = await person("JULIA10");
    const pedro = await person("PEDRO10");
    await reward(
      julia,
      "JULIA10",
      "boa",
      3_000,
      new Date("2026-11-01T12:00:00Z"),
    );

    const his = await balanceView(t.db, pedro);

    expect(his).toMatchObject({ balanceCents: 0, progress: 0, movements: [] });
  });
});
