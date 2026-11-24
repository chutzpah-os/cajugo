import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { activityLog, invoices, notices, stores } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { editPlan, runBillingCycle } from "./service";
import { payingStore, personWith, storeOwner } from "./testing/fixtures";

const DEC15 = new Date("2026-12-15T12:00:00Z");

describe("Editar plano [4b]", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  const deps = (now = DEC15) => ({ db: t.db, now: () => now });

  beforeEach(async () => {
    t = await createTestDb();
  });
  afterEach(() => t.close());

  it("[CAN-FR-011] a mensalidade nova vale para as faturas abertas desde a data; as anteriores ficam com o valor antigo", async () => {
    // Arrange
    const admin = await personWith(t.db, "admin");
    await payingStore(t.db, "loja-a", {
      billingDay: 10,
      nextDueAt: new Date("2027-01-10T03:00:00Z"),
    });

    // Act
    await editPlan(deps(), admin, {
      membershipCents: 12000,
      validFrom: "2027-02-01",
    });
    await runBillingCycle(t.db, new Date("2027-01-07T12:00:00Z"));
    await runBillingCycle(t.db, new Date("2027-02-07T12:00:00Z"));

    // Assert
    const rows = await t.db
      .select({ period: invoices.period, cents: invoices.membershipCents })
      .from(invoices)
      .orderBy(invoices.dueAt);
    expect(rows).toEqual([
      { period: "2027-01", cents: 10000 },
      { period: "2027-02", cents: 12000 },
    ]);
  });

  it("[CAN-FR-011] a data precisa estar pelo menos 30 dias à frente; o valor, nos limites da regra", async () => {
    const admin = await personWith(t.db, "admin");

    await expect(
      editPlan(deps(), admin, {
        membershipCents: 12000,
        validFrom: "2027-01-13",
      }),
    ).rejects.toMatchObject({ status: 422 });
    await expect(
      editPlan(deps(), admin, { membershipCents: 5, validFrom: "2027-02-01" }),
    ).rejects.toMatchObject({ status: 422 });
    await expect(
      editPlan(deps(), admin, {
        membershipCents: 12000,
        validFrom: "2027-01-14",
      }),
    ).resolves.toBeDefined();
  });

  it("[CAN-FR-011] [CAN-SEC-004] os lojistas veem o aviso; o admin recebe a lista de wa.me; fica no registro", async () => {
    // Arrange
    const admin = await personWith(t.db, "admin");
    const a = await payingStore(t.db, "loja-a", {
      billingDay: 10,
      nextDueAt: new Date("2027-01-10T03:00:00Z"),
    });
    const gone = await storeOwner(t.db, "loja-c", "c@x.com");
    await t.db
      .update(stores)
      .set({ status: "canceled" })
      .where(eq(stores.id, gone.storeId));

    // Act
    const result = await editPlan(deps(), admin, {
      membershipCents: 12000,
      validFrom: "2027-02-01",
    });

    // Assert
    const of = (id: string) =>
      t.db
        .select({ kind: notices.kind, data: notices.data })
        .from(notices)
        .where(eq(notices.profileId, id));
    expect(await of(a.userId)).toEqual([
      {
        kind: "plan_changed",
        data: { amountCents: 12000, from: "01/02/2027" },
      },
    ]);
    expect(await of(gone.userId)).toEqual([]);
    expect(result.stores).toHaveLength(1);
    expect(result.stores[0]).toMatchObject({ name: "Loja loja-a" });
    expect(result.stores[0].whatsappUrl).toMatch(/^https:\/\/wa\.me\/55/);
    expect(decodeURIComponent(result.stores[0].whatsappUrl)).toContain(
      "R$ 120,00 a partir de 01/02/2027",
    );
    const [log] = await t.db
      .select({ userId: activityLog.userId, data: activityLog.data })
      .from(activityLog)
      .where(eq(activityLog.action, "plan.edited"));
    expect(log).toEqual({
      userId: admin.userId,
      data: { membershipCents: 12000, validFrom: "2027-02-01", stores: 1 },
    });
  });

  it("[CAN-SEC-002] suporte e lojista não editam o plano (403)", async () => {
    const a = await payingStore(t.db, "loja-a", {
      billingDay: 10,
      nextDueAt: new Date("2027-01-10T03:00:00Z"),
    });
    for (const s of [a, await personWith(t.db, "support")])
      await expect(
        editPlan(deps(), s, {
          membershipCents: 12000,
          validFrom: "2027-02-01",
        }),
      ).rejects.toMatchObject({ status: 403 });
  });
});
