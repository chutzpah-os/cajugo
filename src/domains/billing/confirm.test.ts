import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { activityLog, invoices, payments } from "@/platform/db/schema";
import { FakeCloudinary } from "@/platform/cloudinary/fake-cloudinary";
import { createTestDb } from "@/platform/db/testing/test-db";
import { noticesFor } from "@/domains/notices/service";
import { confirmPayment } from "./service";
import { configurePix, personWith, storeRow } from "./testing/fixtures";
import { storeInReview } from "./testing/flow";

describe("confirmar comprovante", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  let cloudinary: FakeCloudinary;
  let now: Date;
  const deps = () => ({ db: t.db, cloudinary, now: () => now });

  beforeEach(async () => {
    vi.stubEnv("HASH_SECRET", "segredo-de-teste");
    vi.stubEnv("APP_URL", "https://cajugo.test");
    t = await createTestDb();
    cloudinary = new FakeCloudinary();
    now = new Date("2026-11-26T15:00:00Z");
    await configurePix(t.db);
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await t.close();
  });

  it("[PIX-FR-009] [PIX-FR-013] loja ativa, fatura paga, vencimento no mesmo dia do mês seguinte, aviso e wa.me", async () => {
    // Arrange
    const { owner, paymentId } = await storeInReview(deps(), "silva-autocar");
    const admin = await personWith(t.db, "admin");

    // Act
    const { whatsappUrl } = await confirmPayment(deps(), admin, { paymentId });

    // Assert
    const store = await storeRow(t.db, owner.storeId);
    expect(store).toMatchObject({
      status: "active",
      billingDay: 26,
      activatedAt: now,
      slugReservedUntil: null,
    });
    expect(store.nextDueAt?.toISOString()).toBe("2026-12-26T03:00:00.000Z");
    const [invoice] = await t.db.select().from(invoices);
    expect(invoice).toMatchObject({ status: "paid", paidAt: now });
    const [payment] = await t.db.select().from(payments);
    expect(payment).toMatchObject({
      status: "confirmed",
      reviewedBy: admin.userId,
      reviewedAt: now,
    });
    expect((await noticesFor(t.db, owner))[0].text).toBe(
      "Pagamento confirmado. Sua loja está no ar.",
    );
    const text = decodeURIComponent(
      new URL(whatsappUrl).searchParams.get("text")!,
    );
    expect(whatsappUrl).toMatch(/^https:\/\/wa\.me\/5579981360206\?/);
    expect(text).toContain("https://cajugo.test/loja/silva-autocar");
    expect(text).toContain("26/12/2026");
  });

  it("[PIX-FR-008] [PIX-SEC-004] o admin corrige o valor pelo extrato; o histórico guarda os dois", async () => {
    const { paymentId } = await storeInReview(deps(), "loja-a", 9000);
    const admin = await personWith(t.db, "admin");

    await confirmPayment(deps(), admin, { paymentId, amountCents: 10000 });

    const [payment] = await t.db.select().from(payments);
    expect(payment).toMatchObject({ paidCents: 9000, amountCents: 10000 });
    const [log] = await t.db
      .select()
      .from(activityLog)
      .where(eq(activityLog.action, "payment.confirmed"));
    expect(log).toMatchObject({ userId: admin.userId, entityId: paymentId });
    expect(log.data).toMatchObject({
      paidCents: 9000,
      amountCents: 10000,
      expectedCents: 10000,
      reference: "1ª mensalidade",
    });
  });

  it("[PIX-SEC-007] dois admins confirmando ao mesmo tempo: uma ativação e um 'já conferido'", async () => {
    const { paymentId } = await storeInReview(deps(), "loja-a");
    const a1 = await personWith(t.db, "admin");
    const a2 = await personWith(t.db, "admin");

    const results = await Promise.allSettled([
      confirmPayment(deps(), a1, { paymentId }),
      confirmPayment(deps(), a2, { paymentId }),
    ]);

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((r) => r.status === "rejected");
    expect((rejected as PromiseRejectedResult).reason).toMatchObject({
      status: 409,
      detail: "Este comprovante já foi conferido.",
    });
    expect(
      await t.db
        .select()
        .from(activityLog)
        .where(eq(activityLog.action, "payment.confirmed")),
    ).toHaveLength(1);
  });

  it("[PIX-SEC-003] suporte, lojista e usuário da loja não confirmam; pagamento inexistente é 404", async () => {
    const { owner, paymentId } = await storeInReview(deps(), "loja-a");
    const support = await personWith(t.db, "support");
    const staff = await personWith(t.db, "store_staff", owner.storeId);
    const admin = await personWith(t.db, "admin");

    for (const s of [support, owner, staff])
      await expect(
        confirmPayment(deps(), s, { paymentId }),
      ).rejects.toMatchObject({
        status: 403,
      });
    await expect(
      confirmPayment(deps(), admin, { paymentId: crypto.randomUUID() }),
    ).rejects.toMatchObject({ status: 404 });
    expect((await storeRow(t.db, owner.storeId)).status).toBe("payment_review");
  });
});
