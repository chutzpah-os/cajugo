import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { activityLog, payments } from "@/platform/db/schema";
import { FakeCloudinary } from "@/platform/cloudinary/fake-cloudinary";
import { createTestDb } from "@/platform/db/testing/test-db";
import {
  findStoresToCharge,
  receiptUpload,
  registerManualPayment,
} from "./service";
import {
  configurePix,
  personWith,
  storeOwner,
  storeRow,
} from "./testing/fixtures";
import { storeInReview } from "./testing/flow";

describe("pagamento sem comprovante", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  let cloudinary: FakeCloudinary;
  const now = new Date("2026-11-26T15:00:00Z");
  const deps = () => ({ db: t.db, cloudinary, now: () => now });

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

  const cash = (storeId: string) => ({
    storeId,
    method: "cash",
    amountCents: 10000,
    note: "Pago em dinheiro na loja",
  });

  it("[PIX-FR-011] admin acha a loja pelo nome ou endereço e registra: loja ativa, vencimento e histórico", async () => {
    // Arrange
    const owner = await storeOwner(t.db, "silva-autocar", "a@x.com");
    const admin = await personWith(t.db, "admin");

    // Act
    const byName = await findStoresToCharge(deps(), admin, "silva");
    const bySlug = await findStoresToCharge(deps(), admin, "autocar");
    const { whatsappUrl } = await registerManualPayment(
      deps(),
      admin,
      cash(owner.storeId),
    );

    // Assert
    expect(byName.map((s) => s.storeId)).toEqual([owner.storeId]);
    expect(bySlug[0]).toMatchObject({
      slug: "silva-autocar",
      status: "registered",
    });
    const store = await storeRow(t.db, owner.storeId);
    expect(store).toMatchObject({ status: "active", billingDay: 26 });
    const [payment] = await t.db.select().from(payments);
    expect(payment).toMatchObject({
      status: "confirmed",
      manual: true,
      method: "cash",
      amountCents: 10000,
      paidCents: null,
      receiptPublicId: null,
      note: "Pago em dinheiro na loja",
      reviewedBy: admin.userId,
    });
    const [log] = await t.db
      .select()
      .from(activityLog)
      .where(eq(activityLog.action, "payment.manual"));
    expect(log).toMatchObject({ userId: admin.userId });
    expect(log.data).toMatchObject({ method: "cash", amountCents: 10000 });
    expect(whatsappUrl).toMatch(/^https:\/\/wa\.me\//);
    expect(await findStoresToCharge(deps(), admin, "silva")).toEqual([]);
  });

  it("[PIX-FR-011] com comprovante em análise, pede para conferir o pendente", async () => {
    const { owner } = await storeInReview(deps(), "loja-a");
    const admin = await personWith(t.db, "admin");

    expect(
      (await findStoresToCharge(deps(), admin, "loja-a"))[0].pendingReceipt,
    ).toBe(true);
    await expect(
      registerManualPayment(deps(), admin, cash(owner.storeId)),
    ).rejects.toMatchObject({
      status: 409,
      detail: "Confira o comprovante pendente desta loja.",
    });
  });

  it("[PIX-FR-011] loja já ativa ou inexistente não recebe registro", async () => {
    const owner = await storeOwner(t.db, "loja-a", "a@x.com");
    const admin = await personWith(t.db, "admin");
    await registerManualPayment(deps(), admin, cash(owner.storeId));

    await expect(
      registerManualPayment(deps(), admin, cash(owner.storeId)),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      registerManualPayment(deps(), admin, cash(crypto.randomUUID())),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("[PIX-SEC-003] só o admin registra e busca; forma, valor e observação obrigatórios", async () => {
    const owner = await storeOwner(t.db, "loja-a", "a@x.com");
    const support = await personWith(t.db, "support");
    const admin = await personWith(t.db, "admin");

    await expect(
      registerManualPayment(deps(), support, cash(owner.storeId)),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      findStoresToCharge(deps(), owner, "loja"),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      registerManualPayment(deps(), admin, {
        storeId: owner.storeId,
        method: "boleto",
        amountCents: 0,
        note: "",
      }),
    ).rejects.toMatchObject({ status: 422 });
    expect((await storeRow(t.db, owner.storeId)).status).toBe("registered");
  });

  it("[PIX-SEC-007] dois admins registrando ao mesmo tempo: um pagamento e uma ativação", async () => {
    const owner = await storeOwner(t.db, "loja-a", "a@x.com");
    const a1 = await personWith(t.db, "admin");
    const a2 = await personWith(t.db, "admin");

    const results = await Promise.allSettled([
      registerManualPayment(deps(), a1, cash(owner.storeId)),
      registerManualPayment(deps(), a2, cash(owner.storeId)),
    ]);

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(
      (results.find((r) => r.status === "rejected") as PromiseRejectedResult)
        .reason,
    ).toMatchObject({ status: 409 });
    expect(await t.db.select().from(payments)).toHaveLength(1);
  });

  it("[PIX-SEC-007] [PIX-SEC-004] depois do registro, não entra comprovante na mesma fatura; o log guarda a observação", async () => {
    const owner = await storeOwner(t.db, "loja-a", "a@x.com");
    const admin = await personWith(t.db, "admin");
    await registerManualPayment(deps(), admin, cash(owner.storeId));

    await expect(receiptUpload(deps(), owner)).rejects.toMatchObject({
      status: 409,
    });
    const [log] = await t.db
      .select()
      .from(activityLog)
      .where(eq(activityLog.action, "payment.manual"));
    expect(log.data).toMatchObject({ note: "Pago em dinheiro na loja" });
  });
});
