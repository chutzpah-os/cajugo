import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { payments } from "@/platform/db/schema";
import { FakeCloudinary } from "@/platform/cloudinary/fake-cloudinary";
import { createTestDb } from "@/platform/db/testing/test-db";
import { eq } from "drizzle-orm";
import {
  receiptUpload,
  reviewQueue,
  startCheckout,
  submitReceipt,
} from "./service";
import { configurePix, personWith, storeOwner } from "./testing/fixtures";

describe("fila de comprovantes [10b]", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  let cloudinary: FakeCloudinary;
  let now: Date;
  const deps = () => ({ db: t.db, cloudinary, now: () => now });

  beforeEach(async () => {
    vi.stubEnv("HASH_SECRET", "segredo-de-teste");
    t = await createTestDb();
    cloudinary = new FakeCloudinary();
    now = new Date("2026-11-08T12:00:00Z");
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await t.close();
  });

  async function sent(slug: string, paidCents: number, at: string) {
    const s = await storeOwner(t.db, slug, `${slug}@x.com`);
    await startCheckout(deps(), s, { taxId: "529.982.247-25" });
    const signed = await receiptUpload(deps(), s);
    cloudinary.simulateUpload(signed, { format: "png", bytes: 1000 });
    now = new Date(at);
    await submitReceipt(deps(), s, {
      publicId: `${signed.fields.folder}/${signed.fields.public_id}`,
      paidCents,
    });
    return s;
  }

  it("[PIX-FR-007] [PIX-FR-008] do mais antigo ao mais recente, com referência, valor, horário, alerta e totais", async () => {
    // Arrange
    await configurePix(t.db);
    await sent("loja-dez", 10000, "2026-11-08T13:00:00Z");
    await sent("loja-nove", 9000, "2026-11-08T12:00:00Z");
    const confirmed = await sent("loja-ok", 10000, "2026-11-08T11:00:00Z");
    await t.db
      .update(payments)
      .set({
        status: "confirmed",
        reviewedAt: new Date("2026-11-08T11:30:00Z"),
      })
      .where(eq(payments.storeId, confirmed.storeId));
    const admin = await personWith(t.db, "admin");

    // Act
    const queue = await reviewQueue(deps(), admin);

    // Assert
    expect(queue.items.map((i) => i.storeName)).toEqual([
      "Loja loja-nove",
      "Loja loja-dez",
    ]);
    expect(queue.items[0]).toMatchObject({
      reference: "1ª mensalidade",
      paidCents: 9000,
      expectedCents: 10000,
      differs: true,
      submittedAt: new Date("2026-11-08T12:00:00Z"),
    });
    expect(queue.items[1].differs).toBe(false);
    expect(queue).toMatchObject({
      waiting: 2,
      confirmedThisMonth: 1,
      pixReady: true,
      canReview: true,
    });
  });

  it("[PIX-FR-004] sem chave Pix configurada, a fila avisa o admin", async () => {
    const admin = await personWith(t.db, "admin");

    expect((await reviewQueue(deps(), admin)).pixReady).toBe(false);
  });

  it("[PIX-SEC-003] suporte vê a fila sem poder conferir; lojista e usuário da loja não veem", async () => {
    await configurePix(t.db);
    const a = await sent("loja-a", 10000, "2026-11-08T12:00:00Z");
    const support = await personWith(t.db, "support");
    const staff = await personWith(t.db, "store_staff", a.storeId);

    const queue = await reviewQueue(deps(), support);

    expect(queue.items).toHaveLength(1);
    expect(queue.canReview).toBe(false);
    await expect(reviewQueue(deps(), a)).rejects.toMatchObject({ status: 403 });
    await expect(reviewQueue(deps(), staff)).rejects.toMatchObject({
      status: 403,
    });
  });
});
