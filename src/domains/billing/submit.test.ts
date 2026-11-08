import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { activityLog, payments } from "@/platform/db/schema";
import { FakeCloudinary } from "@/platform/cloudinary/fake-cloudinary";
import { createTestDb } from "@/platform/db/testing/test-db";
import {
  paymentInReview,
  receiptUpload,
  startCheckout,
  submitReceipt,
} from "./service";
import { configurePix, storeOwner, storeRow } from "./testing/fixtures";

const MB = 1024 * 1024;

describe("envio do comprovante", () => {
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

  async function readyToPay(slug = "loja-a", email = "a@x.com") {
    const s = await storeOwner(t.db, slug, email);
    await startCheckout(deps(), s, { taxId: "529.982.247-25" });
    return s;
  }

  /** O navegador enviou o arquivo com a assinatura da loja `s`. */
  async function uploaded(
    s: Awaited<ReturnType<typeof readyToPay>>,
    file = { format: "png", bytes: 200_000 },
  ) {
    const signed = await receiptUpload(deps(), s);
    cloudinary.simulateUpload(signed, file);
    return `${signed.fields.folder}/${signed.fields.public_id}`;
  }

  it("[PIX-FR-005] [PIX-FR-006] comprovante com valor pago: pagamento enviado e loja em análise", async () => {
    // Arrange
    const a = await readyToPay();
    const publicId = await uploaded(a, { format: "pdf", bytes: 300_000 });

    // Act
    await submitReceipt(deps(), a, { publicId, paidCents: 10000 });

    // Assert
    const [payment] = await t.db.select().from(payments);
    expect(payment).toMatchObject({
      storeId: a.storeId,
      status: "submitted",
      paidCents: 10000,
      amountCents: 10000,
      receiptPublicId: publicId,
      receiptFormat: "pdf",
      manual: false,
    });
    expect((await storeRow(t.db, a.storeId)).status).toBe("payment_review");
    const [log] = await t.db
      .select()
      .from(activityLog)
      .where(eq(activityLog.action, "payment.submitted"));
    expect(log.data).toMatchObject({ paidCents: 10000, expectedCents: 10000 });
  });

  it("[PIX-FR-006] em análise, não envia outro comprovante (e o arquivo extra é apagado)", async () => {
    const a = await readyToPay();
    const first = await uploaded(a);
    const second = await uploaded(a);
    await submitReceipt(deps(), a, { publicId: first, paidCents: 10000 });

    await expect(
      submitReceipt(deps(), a, { publicId: second, paidCents: 10000 }),
    ).rejects.toMatchObject({ status: 409 });
    expect(await t.db.select().from(payments)).toHaveLength(1);
    expect(cloudinary.destroyed).toEqual([second]);
  });

  it("[PIX-FR-005] [PIX-SEC-002] recusa formato proibido ou arquivo acima de 10 MB e apaga o arquivo", async () => {
    const a = await readyToPay();
    for (const file of [
      { format: "svg", bytes: 1000 },
      { format: "gif", bytes: 1000 },
      { format: "pdf", bytes: 10 * MB + 1 },
    ]) {
      const publicId = await uploaded(a, file);
      await expect(
        submitReceipt(deps(), a, { publicId, paidCents: 10000 }),
      ).rejects.toMatchObject({ status: 422 });
      expect(cloudinary.destroyed).toContain(publicId);
    }
    expect(await t.db.select().from(payments)).toHaveLength(0);
    expect((await storeRow(t.db, a.storeId)).status).toBe("registered");
  });

  it("[PIX-FR-005] valor pago obrigatório e positivo", async () => {
    const a = await readyToPay();
    const publicId = await uploaded(a);

    for (const paidCents of [0, -100, 1.5, undefined])
      await expect(
        submitReceipt(deps(), a, { publicId, paidCents }),
      ).rejects.toMatchObject({
        status: 422,
        errors: [expect.objectContaining({ field: "paidCents" })],
      });
  });

  it("[PIX-SEC-001] a loja B não envia o arquivo da pasta da loja A, nem nome fora do padrão", async () => {
    // Arrange
    const a = await readyToPay();
    const b = await readyToPay("loja-b", "b@x.com");
    const fromA = await uploaded(a);

    // Act + Assert
    for (const publicId of [
      fromA,
      `staging/receipts/${b.storeId}/receipt-x/../../${a.storeId}/${fromA.split("/").pop()}`,
      `staging/receipts/${b.storeId}/receipt-qualquer`,
    ])
      await expect(
        submitReceipt(deps(), b, { publicId, paidCents: 10000 }),
      ).rejects.toMatchObject({ status: 404 });
    expect(await t.db.select().from(payments)).toHaveLength(0);
  });

  it("[PIX-SEC-004] a entrada não aceita loja, fatura, status nem valor esperado", async () => {
    const a = await readyToPay();
    const publicId = await uploaded(a);

    await expect(
      submitReceipt(deps(), a, {
        publicId,
        paidCents: 10000,
        totalCents: 1,
        storeId: crypto.randomUUID(),
      }),
    ).rejects.toMatchObject({ status: 422 });
    expect(await t.db.select().from(payments)).toHaveLength(0);
  });

  it("[PIX-FR-006] [10a] mostra o comprovante em análise e o prazo; sem nenhum, nada", async () => {
    const a = await readyToPay();
    expect(await paymentInReview(deps(), a)).toBeNull();
    const publicId = await uploaded(a);

    await submitReceipt(deps(), a, { publicId, paidCents: 10000 });

    expect(await paymentInReview(deps(), a)).toMatchObject({
      paidCents: 10000,
      reviewBusinessDays: 1,
    });
  });
});
