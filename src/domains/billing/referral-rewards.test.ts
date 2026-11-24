import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import {
  billingCredits,
  invoices,
  payments,
  referralCodes,
  referralRewards,
} from "@/platform/db/schema";
import { FakeCloudinary } from "@/platform/cloudinary/fake-cloudinary";
import { createTestDb } from "@/platform/db/testing/test-db";
import {
  confirmPayment,
  receiptUpload,
  registerManualPayment,
  runBillingCycle,
  startCheckout,
  submitReceipt,
} from "./service";
import {
  configurePix,
  payingStore,
  personWith,
  storeOwner,
} from "./testing/fixtures";

const NOW = new Date("2026-11-26T15:00:00Z");

describe("Caju Indica na cobrança", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  let cloudinary: FakeCloudinary;
  const deps = () => ({ db: t.db, cloudinary, now: () => NOW });

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

  /** Ricardo (lojista ativo, vence dia 10/12) indica a Loja Nova. */
  async function referred() {
    const ricardo = await payingStore(t.db, "loja-ricardo", {
      billingDay: 10,
      nextDueAt: new Date("2026-12-10T03:00:00Z"),
    });
    const [{ code }] = await t.db
      .select({ code: referralCodes.code })
      .from(referralCodes)
      .where(eq(referralCodes.profileId, ricardo.userId));
    const nova = await storeOwner(t.db, "loja-nova", "n@x.com", {
      referralCode: code,
    });
    await startCheckout(deps(), nova, { taxId: "529.982.247-25" });
    return { ricardo, nova };
  }

  it("[IND-FR-006] [IND-FR-009] confirmar a 1ª da indicada dá crédito a Ricardo, abatido na fatura dele", async () => {
    // Arrange
    const { ricardo, nova } = await referred();
    const signed = await receiptUpload(deps(), nova);
    cloudinary.simulateUpload(signed, { format: "png", bytes: 1000 });
    await submitReceipt(deps(), nova, {
      publicId: `${signed.fields.folder}/${signed.fields.public_id}`,
      paidCents: 10_000,
    });
    const [payment] = await t.db.select().from(payments);
    const admin = await personWith(t.db, "admin");

    // Act
    await confirmPayment(deps(), admin, { paymentId: payment.id });
    await runBillingCycle(t.db, new Date("2026-12-07T12:00:00Z"));

    // Assert
    const [credit] = await t.db.select().from(billingCredits);
    expect(credit).toMatchObject({
      storeId: ricardo.storeId,
      kind: "referral",
      amountCents: 3_000,
    });
    const [dec] = await t.db
      .select()
      .from(invoices)
      .where(eq(invoices.storeId, ricardo.storeId));
    expect(dec).toMatchObject({ creditCents: 3_000, totalCents: 7_000 });
  });

  it("[IND-FR-006] pagamento registrado sem comprovante também rende", async () => {
    const { nova } = await referred();
    const admin = await personWith(t.db, "admin");

    await registerManualPayment(deps(), admin, {
      storeId: nova.storeId,
      method: "cash",
      amountCents: 10_000,
      note: "Pago na loja",
    });

    expect(await t.db.select().from(referralRewards)).toHaveLength(1);
  });

  it("[IND-SEC-004] confirmar de novo não gera outra recompensa", async () => {
    const { nova } = await referred();
    const admin = await personWith(t.db, "admin");
    await registerManualPayment(deps(), admin, {
      storeId: nova.storeId,
      method: "cash",
      amountCents: 10_000,
      note: "Pago na loja",
    });

    await expect(
      registerManualPayment(deps(), admin, {
        storeId: nova.storeId,
        method: "cash",
        amountCents: 10_000,
        note: "De novo",
      }),
    ).rejects.toMatchObject({ status: 409 });

    expect(await t.db.select().from(referralRewards)).toHaveLength(1);
    expect(await t.db.select().from(billingCredits)).toHaveLength(1);
  });
});
