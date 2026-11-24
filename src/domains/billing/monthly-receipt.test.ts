import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { invoices, notices, payments } from "@/platform/db/schema";
import { FakeCloudinary } from "@/platform/cloudinary/fake-cloudinary";
import { createTestDb } from "@/platform/db/testing/test-db";
import {
  invoiceView,
  pixView,
  receiptUpload,
  rejectPayment,
  reviewQueue,
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
const DEC8 = new Date("2026-12-08T12:00:00Z");

describe("comprovante da fatura mensal", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  let cloudinary: FakeCloudinary;
  const deps = () => ({ db: t.db, cloudinary, now: () => DEC8 });

  beforeEach(async () => {
    vi.stubEnv("HASH_SECRET", "segredo-de-teste");
    t = await createTestDb();
    cloudinary = new FakeCloudinary();
    await configurePix(t.db);
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await t.close();
  });

  /** Loja com as faturas de novembro (vencida) e dezembro abertas. */
  async function twoOpen(status: "active" | "past_due" = "past_due") {
    const a = await payingStore(t.db, "loja-a", {
      billingDay: 10,
      nextDueAt: NOV_DUE,
      status,
    });
    await runBillingCycle(t.db, new Date("2026-11-07T12:00:00Z"));
    await runBillingCycle(t.db, new Date("2026-12-07T12:00:00Z"));
    return a;
  }

  async function send(s: { storeId: string }, paidCents: number) {
    const signed = await receiptUpload(deps(), s as never);
    cloudinary.simulateUpload(signed, { format: "png", bytes: 1000 });
    await submitReceipt(deps(), s as never, {
      publicId: `${signed.fields.folder}/${signed.fields.public_id}`,
      paidCents,
    });
  }

  it("[SUB-FR-016] [6c] cobra o total em aberto das faturas mensais", async () => {
    // Arrange
    const a = await twoOpen();

    // Act
    const view = await pixView(deps(), a);

    // Assert
    expect(view?.amountCents).toBe(20_000);
  });

  it("[SUB-FR-003] o comprovante entra na fila como 'Mensalidade 11/2026' e a loja segue no status em que estava", async () => {
    // Arrange
    const a = await twoOpen("past_due");
    const admin = await personWith(t.db, "admin");

    // Act
    await send(a, 20_000);

    // Assert
    expect((await storeRow(t.db, a.storeId)).status).toBe("past_due");
    const queue = await reviewQueue(deps(), admin);
    expect(queue.items[0]).toMatchObject({
      reference: "Mensalidade 11/2026",
      paidCents: 20_000,
      expectedCents: 20_000,
      differs: false,
    });
  });

  it("[SUB-FR-003] com um comprovante em análise, outro não entra", async () => {
    const a = await twoOpen();
    await send(a, 20_000);

    await expect(receiptUpload(deps(), a)).rejects.toMatchObject({
      status: 409,
    });
  });

  it("[SUB-FR-005] recusar: a loja segue no status, e o lojista vê o motivo e o valor faltante", async () => {
    // Arrange
    const a = await twoOpen("past_due");
    const admin = await personWith(t.db, "admin");
    await send(a, 15_000);
    const [payment] = await t.db.select().from(payments);

    // Act
    await rejectPayment(deps(), admin, {
      paymentId: payment.id,
      reason: "Valor divergente",
    });

    // Assert
    expect((await storeRow(t.db, a.storeId)).status).toBe("past_due");
    const [notice] = await t.db
      .select()
      .from(notices)
      .where(eq(notices.kind, "payment_rejected"));
    expect(notice.data).toEqual({
      reason: "Valor divergente",
      missingCents: 5_000,
    });
    const open = await t.db
      .select()
      .from(invoices)
      .where(eq(invoices.status, "open"));
    expect(open).toHaveLength(2);
    expect((await invoiceView(deps(), a)).lastRejection).toEqual({
      reason: "Valor divergente",
      missingCents: 5_000,
    });
  });

  it("[SUB-SEC-002] total, taxa ou crédito junto com o comprovante são recusados", async () => {
    const a = await twoOpen();
    const signed = await receiptUpload(deps(), a);
    cloudinary.simulateUpload(signed, { format: "png", bytes: 1000 });

    await expect(
      submitReceipt(deps(), a, {
        publicId: `${signed.fields.folder}/${signed.fields.public_id}`,
        paidCents: 100,
        totalCents: 100,
      }),
    ).rejects.toMatchObject({ status: 422 });
    expect(await t.db.select().from(payments)).toHaveLength(0);
  });

  it("[SUB-SEC-001] o lojista B não paga a fatura da loja A: o arquivo assinado para A não vale para B", async () => {
    const a = await twoOpen();
    const b = await payingStore(t.db, "loja-b", {
      billingDay: 8,
      nextDueAt: new Date("2026-12-08T03:00:00Z"),
    });
    await runBillingCycle(t.db, new Date("2026-12-07T12:00:00Z"));
    const signed = await receiptUpload(deps(), a);
    cloudinary.simulateUpload(signed, { format: "png", bytes: 1000 });

    await expect(
      submitReceipt(deps(), b, {
        publicId: `${signed.fields.folder}/${signed.fields.public_id}`,
        paidCents: 20_000,
      }),
    ).rejects.toMatchObject({ status: 404 });
    expect(await t.db.select().from(payments)).toHaveLength(0);
  });

  it("[SUB-FR-003] com o comprovante em conferência, o job não marca atraso nem suspende", async () => {
    // Arrange
    const a = await payingStore(t.db, "loja-c", {
      billingDay: 10,
      nextDueAt: new Date("2026-12-10T03:00:00Z"),
    });
    await runBillingCycle(t.db, new Date("2026-12-07T12:00:00Z"));
    await send(a, 10_000);

    // Act
    const result = await runBillingCycle(
      t.db,
      new Date("2026-12-20T12:00:00Z"),
    );

    // Assert
    expect(result.pastDue).toBe(0);
    expect((await storeRow(t.db, a.storeId)).status).toBe("active");
  });
});
