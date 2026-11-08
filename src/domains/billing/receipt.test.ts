import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FakeCloudinary } from "@/platform/cloudinary/fake-cloudinary";
import { createTestDb } from "@/platform/db/testing/test-db";
import { registerManualPayment } from "./service";
import { receiptResponse } from "./http";
import { configurePix, personWith, storeOwner } from "./testing/fixtures";
import { storeInReview } from "./testing/flow";

describe("rota do comprovante (contract.md, ADR 0011)", () => {
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

  it("[PIX-FR-007] [PIX-SEC-002] admin, suporte e o próprio lojista recebem o arquivo, sem cache e sem URL do Cloudinary", async () => {
    // Arrange
    const { owner, paymentId } = await storeInReview(deps(), "loja-a");
    const people = [
      owner,
      await personWith(t.db, "admin"),
      await personWith(t.db, "support"),
    ];

    for (const session of people) {
      // Act
      const res = await receiptResponse(deps(), session, paymentId);

      // Assert
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("image/png");
      expect(res.headers.get("cache-control")).toBe("private, no-store");
      expect(res.headers.get("x-content-type-options")).toBe("nosniff");
      expect(res.headers.get("content-disposition")).toBe(
        'inline; filename="comprovante-1a-mensalidade.png"',
      );
      expect(res.headers.get("location")).toBeNull();
    }
  });

  it("[PIX-SEC-001] [PIX-SEC-003] sem sessão 401; outra loja, usuário da loja, id inválido ou inexistente 404", async () => {
    // Arrange
    const { owner, paymentId } = await storeInReview(deps(), "loja-a");
    const other = await storeOwner(t.db, "loja-b", "b@x.com");
    const staff = await personWith(t.db, "store_staff", owner.storeId);
    const seller = await personWith(t.db, "seller");

    // Act + Assert
    expect((await receiptResponse(deps(), null, paymentId)).status).toBe(401);
    for (const session of [other, staff, seller])
      expect((await receiptResponse(deps(), session, paymentId)).status).toBe(
        404,
      );
    expect((await receiptResponse(deps(), owner, "nao-e-uuid")).status).toBe(
      404,
    );
    expect(
      (await receiptResponse(deps(), owner, crypto.randomUUID())).status,
    ).toBe(404);
  });

  it("[PIX-FR-011] registro sem comprovante não tem arquivo: 404", async () => {
    const owner = await storeOwner(t.db, "loja-a", "a@x.com");
    const admin = await personWith(t.db, "admin");
    await registerManualPayment(deps(), admin, {
      storeId: owner.storeId,
      method: "cash",
      amountCents: 10000,
      note: "Dinheiro",
    });
    const [{ id }] = await t.db.query.payments.findMany({
      columns: { id: true },
    });

    expect((await receiptResponse(deps(), admin, id)).status).toBe(404);
  });
});
