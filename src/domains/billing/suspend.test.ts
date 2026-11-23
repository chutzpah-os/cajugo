import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { activityLog, invoices, notices } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { uuidv7 } from "@/platform/db/uuid";
import { reactivateStore, runBillingCycle, suspendStore } from "./service";
import { payingStore, personWith, storeRow } from "./testing/fixtures";

const DEC12 = new Date("2026-12-12T12:00:00Z");

describe("suspender e reativar pelo admin", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  const deps = () => ({ db: t.db, now: () => DEC12 });

  beforeEach(async () => {
    t = await createTestDb();
  });
  afterEach(() => t.close());

  /** Loja B em atraso há 2 dias, com a fatura de dezembro aberta. */
  async function lateStore() {
    const b = await payingStore(t.db, "loja-b", {
      billingDay: 10,
      nextDueAt: new Date("2026-12-10T03:00:00Z"),
    });
    await runBillingCycle(t.db, new Date("2026-12-07T12:00:00Z"));
    await runBillingCycle(t.db, new Date("2026-12-11T12:00:00Z"));
    return b;
  }

  it("[SUB-FR-013] Suspender a loja em atraso; Reativar com motivo a devolve em atraso, com a fatura aberta", async () => {
    // Arrange
    const b = await lateStore();
    const admin = await personWith(t.db, "admin");

    // Act
    await suspendStore(deps(), admin, { storeId: b.storeId });
    const suspended = (await storeRow(t.db, b.storeId)).status;
    await reactivateStore(deps(), admin, {
      storeId: b.storeId,
      reason: "Acordo de pagamento",
    });

    // Assert
    expect(suspended).toBe("suspended");
    expect(await storeRow(t.db, b.storeId)).toMatchObject({
      status: "past_due",
      pastDueSince: DEC12,
    });
    const [invoice] = await t.db.select().from(invoices);
    expect(invoice.status).toBe("open");
  });

  it("[SUB-FR-013] reativada sem pagamento, o job suspende de novo depois da tolerância contada da reativação", async () => {
    const b = await lateStore();
    const admin = await personWith(t.db, "admin");
    await suspendStore(deps(), admin, { storeId: b.storeId });
    await reactivateStore(deps(), admin, {
      storeId: b.storeId,
      reason: "Acordo de pagamento",
    });

    const beforeTolerance = await runBillingCycle(
      t.db,
      new Date("2026-12-16T12:00:00Z"),
    );
    const after = await runBillingCycle(t.db, new Date("2026-12-17T12:00:00Z"));

    expect(beforeTolerance.suspended).toBe(0);
    expect(after.suspended).toBe(1);
  });

  it("[SUB-FR-013] só suspende loja em atraso e só reativa loja suspensa; motivo de 3 a 200", async () => {
    const b = await lateStore();
    const ok = await payingStore(t.db, "em-dia", {
      billingDay: 20,
      nextDueAt: new Date("2026-12-20T03:00:00Z"),
    });
    const admin = await personWith(t.db, "admin");

    await expect(
      suspendStore(deps(), admin, { storeId: ok.storeId }),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      reactivateStore(deps(), admin, { storeId: b.storeId, reason: "Acordo" }),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      reactivateStore(deps(), admin, { storeId: b.storeId, reason: "ok" }),
    ).rejects.toMatchObject({ status: 422 });
    await expect(
      suspendStore(deps(), admin, { storeId: uuidv7() }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("[SUB-FR-015] [SUB-SEC-004] avisos ao lojista e registro com o admin e o motivo", async () => {
    const b = await lateStore();
    const admin = await personWith(t.db, "admin");

    await suspendStore(deps(), admin, { storeId: b.storeId });
    await reactivateStore(deps(), admin, {
      storeId: b.storeId,
      reason: "Acordo de pagamento",
    });

    const mine = await t.db
      .select()
      .from(notices)
      .where(eq(notices.profileId, b.userId));
    expect(mine.map((n) => [n.kind, n.data])).toEqual(
      expect.arrayContaining([
        ["store_suspended", {}],
        ["store_reactivated", { byAdmin: true }],
      ]),
    );
    const log = await t.db.select().from(activityLog);
    expect(log.find((l) => l.action === "store.suspended")).toMatchObject({
      userId: admin.userId,
      entityId: b.storeId,
      data: { by: "admin" },
    });
    expect(log.find((l) => l.action === "store.reactivated")).toMatchObject({
      userId: admin.userId,
      data: { by: "admin", reason: "Acordo de pagamento" },
    });
  });

  it("[SUB-SEC-003] suporte, usuário da loja, lojista e vendedor não suspendem nem reativam", async () => {
    const b = await lateStore();
    for (const role of [
      "support",
      "store_staff",
      "store_owner",
      "seller",
    ] as const) {
      const someone = await personWith(t.db, role, b.storeId);

      await expect(
        suspendStore(deps(), someone, { storeId: b.storeId }),
      ).rejects.toMatchObject({ status: 403 });
      await expect(
        reactivateStore(deps(), someone, {
          storeId: b.storeId,
          reason: "Acordo de pagamento",
        }),
      ).rejects.toMatchObject({ status: 403 });
    }
    expect((await storeRow(t.db, b.storeId)).status).toBe("past_due");
  });
});
