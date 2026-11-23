import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import {
  activityLog,
  billingCredits,
  invoices,
  notices,
  payments,
} from "@/platform/db/schema";
import { FakeCloudinary } from "@/platform/cloudinary/fake-cloudinary";
import { createTestDb } from "@/platform/db/testing/test-db";
import { saoPauloDate } from "./due-date";
import {
  confirmPayment,
  receiptUpload,
  runBillingCycle,
  submitReceipt,
} from "./service";
import {
  configurePix,
  payingStore,
  personWith,
  storeRow,
} from "./testing/fixtures";

const NOV_DUE = new Date("2026-11-10T03:00:00Z");
const DEC20 = new Date("2026-12-20T12:00:00Z");

describe("confirmar o comprovante da fatura mensal", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  let cloudinary: FakeCloudinary;
  const deps = () => ({ db: t.db, cloudinary, now: () => DEC20 });

  beforeEach(async () => {
    vi.stubEnv("HASH_SECRET", "segredo-de-teste");
    vi.stubEnv("APP_URL", "https://cajugo.test");
    t = await createTestDb();
    cloudinary = new FakeCloudinary();
    await configurePix(t.db);
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await t.close();
  });

  /** Loja suspensa com novembro e dezembro abertas (R$ 100 cada). */
  async function suspendedWithTwo() {
    const a = await payingStore(t.db, "loja-a", {
      billingDay: 10,
      nextDueAt: NOV_DUE,
    });
    await runBillingCycle(t.db, new Date("2026-11-07T12:00:00Z"));
    await runBillingCycle(t.db, new Date("2026-11-11T12:00:00Z"));
    await runBillingCycle(t.db, new Date("2026-11-16T12:00:00Z"));
    await runBillingCycle(t.db, new Date("2026-12-07T12:00:00Z"));
    expect((await storeRow(t.db, a.storeId)).status).toBe("suspended");
    return a;
  }

  async function paid(s: { storeId: string }, paidCents: number) {
    const signed = await receiptUpload(deps(), s as never);
    cloudinary.simulateUpload(signed, { format: "png", bytes: 1000 });
    await submitReceipt(deps(), s as never, {
      publicId: `${signed.fields.folder}/${signed.fields.public_id}`,
      paidCents,
    });
    const [payment] = await t.db
      .select()
      .from(payments)
      .where(eq(payments.status, "submitted"));
    return payment.id;
  }

  const statuses = async () =>
    (await t.db.select().from(invoices).orderBy(invoices.dueAt)).map(
      (i) => i.status,
    );

  it("[SUB-FR-016] [SUB-FR-004] R$ 200 quita as duas, da mais antiga, e a loja suspensa volta a ativa", async () => {
    // Arrange
    const a = await suspendedWithTwo();
    const admin = await personWith(t.db, "admin");
    const paymentId = await paid(a, 20_000);

    // Act
    await confirmPayment(deps(), admin, { paymentId });

    // Assert
    expect(await statuses()).toEqual(["paid", "paid"]);
    const store = await storeRow(t.db, a.storeId);
    expect(store).toMatchObject({ status: "active", pastDueSince: null });
    expect(saoPauloDate(store.nextDueAt!)).toBe("2027-01-10");
  });

  it("[SUB-FR-016] R$ 100 quita só novembro e a loja continua suspensa", async () => {
    const a = await suspendedWithTwo();
    const admin = await personWith(t.db, "admin");
    const paymentId = await paid(a, 10_000);

    await confirmPayment(deps(), admin, { paymentId });

    expect(await statuses()).toEqual(["paid", "open"]);
    expect((await storeRow(t.db, a.storeId)).status).toBe("suspended");
  });

  it("[SUB-FR-017] valor corrigido maior: a sobra vira crédito na próxima fatura", async () => {
    const a = await suspendedWithTwo();
    const admin = await personWith(t.db, "admin");
    const paymentId = await paid(a, 20_000);

    await confirmPayment(deps(), admin, { paymentId, amountCents: 25_000 });

    const [credit] = await t.db.select().from(billingCredits);
    expect(credit).toMatchObject({
      storeId: a.storeId,
      kind: "overpayment",
      amountCents: 5_000,
      sourceId: paymentId,
      appliedInvoiceId: null,
    });
  });

  it("[SUB-FR-017] valor menor que a fatura mais antiga não confirma nada (o admin recusa)", async () => {
    const a = await suspendedWithTwo();
    const admin = await personWith(t.db, "admin");
    const paymentId = await paid(a, 9_000);

    await expect(
      confirmPayment(deps(), admin, { paymentId }),
    ).rejects.toMatchObject({ status: 422 });

    expect(await statuses()).toEqual(["open", "open"]);
    const [payment] = await t.db.select().from(payments);
    expect(payment.status).toBe("submitted");
  });

  it("[SUB-FR-015] [SUB-SEC-004] reativada pelo pagamento: avisos ao lojista e aos admins e o registro", async () => {
    const a = await suspendedWithTwo();
    const admin = await personWith(t.db, "admin");
    const paymentId = await paid(a, 20_000);

    await confirmPayment(deps(), admin, { paymentId });

    const reactivated = await t.db
      .select()
      .from(notices)
      .where(eq(notices.kind, "store_reactivated"));
    expect(reactivated.map((n) => n.profileId).sort()).toEqual(
      [a.userId, admin.userId].sort(),
    );
    const actions = (await t.db.select().from(activityLog)).map(
      (l) => l.action,
    );
    expect(actions).toContain("store.reactivated");
    const [log] = await t.db
      .select()
      .from(activityLog)
      .where(eq(activityLog.action, "payment.confirmed"));
    expect(log.data).toMatchObject({ paidInvoices: 2, creditCents: 0 });
  });

  it("[SUB-FR-004] loja em atraso que paga a fatura volta a ativa", async () => {
    const a = await payingStore(t.db, "loja-b", {
      billingDay: 10,
      nextDueAt: new Date("2026-12-10T03:00:00Z"),
    });
    await runBillingCycle(t.db, new Date("2026-12-07T12:00:00Z"));
    await runBillingCycle(t.db, new Date("2026-12-11T12:00:00Z"));
    const admin = await personWith(t.db, "admin");
    const paymentId = await paid(a, 10_000);

    await confirmPayment(deps(), admin, { paymentId });

    expect(await storeRow(t.db, a.storeId)).toMatchObject({
      status: "active",
      pastDueSince: null,
    });
  });
});
