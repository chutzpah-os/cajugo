import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { activityLog, invoices, payments } from "@/platform/db/schema";
import { FakeCloudinary } from "@/platform/cloudinary/fake-cloudinary";
import { createTestDb } from "@/platform/db/testing/test-db";
import { noticesFor } from "@/domains/notices/service";
import {
  checkoutView,
  confirmPayment,
  receiptUpload,
  rejectPayment,
} from "./service";
import { configurePix, personWith, storeRow } from "./testing/fixtures";
import { storeInReview } from "./testing/flow";

describe("recusar comprovante", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  let cloudinary: FakeCloudinary;
  const deps = () => ({ db: t.db, cloudinary });

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

  it("[PIX-FR-010] sem motivo não recusa e nada muda", async () => {
    const { owner, paymentId } = await storeInReview(deps(), "loja-a", 9000);
    const admin = await personWith(t.db, "admin");

    for (const reason of ["", "  ", "ab"])
      await expect(
        rejectPayment(deps(), admin, { paymentId, reason }),
      ).rejects.toMatchObject({
        status: 422,
        errors: [
          expect.objectContaining({
            field: "reason",
            message: "Informe o motivo.",
          }),
        ],
      });
    expect((await storeRow(t.db, owner.storeId)).status).toBe("payment_review");
    expect((await t.db.select().from(payments))[0].status).toBe("submitted");
  });

  it("[PIX-FR-010] [PIX-FR-013] com motivo: loja volta a cadastrada, lojista vê motivo e valor faltante e pode reenviar", async () => {
    // Arrange
    const { owner, paymentId } = await storeInReview(deps(), "loja-a", 9000);
    const admin = await personWith(t.db, "admin");

    // Act
    await rejectPayment(deps(), admin, {
      paymentId,
      reason: "Valor divergente",
    });

    // Assert
    expect((await storeRow(t.db, owner.storeId)).status).toBe("registered");
    const [payment] = await t.db.select().from(payments);
    expect(payment).toMatchObject({
      status: "rejected",
      rejectReason: "Valor divergente",
      reviewedBy: admin.userId,
    });
    expect((await t.db.select().from(invoices))[0].status).toBe("open");
    expect((await checkoutView(deps(), owner)).lastRejection).toEqual({
      reason: "Valor divergente",
      missingCents: 1000,
    });
    expect((await noticesFor(t.db, owner))[0].text).toBe(
      "Comprovante recusado: Valor divergente. Faltam R$ 10,00.",
    );
    await expect(receiptUpload(deps(), owner)).resolves.toBeDefined();
    const [log] = await t.db
      .select()
      .from(activityLog)
      .where(eq(activityLog.action, "payment.rejected"));
    expect(log.data).toMatchObject({
      reason: "Valor divergente",
      paidCents: 9000,
      expectedCents: 10000,
    });
  });

  it("[PIX-SEC-007] confirmado não pode ser recusado depois (e vice-versa)", async () => {
    const { paymentId } = await storeInReview(deps(), "loja-a");
    const admin = await personWith(t.db, "admin");
    await confirmPayment(deps(), admin, { paymentId });

    await expect(
      rejectPayment(deps(), admin, { paymentId, reason: "Valor divergente" }),
    ).rejects.toMatchObject({
      status: 409,
      detail: "Este comprovante já foi conferido.",
    });
  });

  it("[PIX-SEC-003] suporte não recusa", async () => {
    const { paymentId } = await storeInReview(deps(), "loja-a");
    const support = await personWith(t.db, "support");

    await expect(
      rejectPayment(deps(), support, { paymentId, reason: "Valor divergente" }),
    ).rejects.toMatchObject({ status: 403 });
  });
});
