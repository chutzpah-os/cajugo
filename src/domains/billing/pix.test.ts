import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stores } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { FakeCloudinary } from "@/platform/cloudinary/fake-cloudinary";
import { crc16 } from "@/platform/pix/br-code";
import { pixView, receiptUpload, startCheckout } from "./service";
import { configurePix, personWith, PIX, storeOwner } from "./testing/fixtures";

describe("Pix [6c]", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  const deps = () => ({ db: t.db, cloudinary: new FakeCloudinary() });

  beforeEach(async () => {
    vi.stubEnv("HASH_SECRET", "segredo-de-teste");
    t = await createTestDb();
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

  it("[PIX-FR-004] mostra valor, chave, favorecido, QR com o valor e o prazo de conferência", async () => {
    // Arrange
    await configurePix(t.db);
    const a = await readyToPay();

    // Act
    const view = await pixView(deps(), a);

    // Assert
    expect(view).toMatchObject({
      amountCents: 10000,
      key: PIX.key,
      beneficiary: PIX.beneficiary,
      reviewBusinessDays: 1,
    });
    expect(view!.brCode).toContain(
      `01${String(PIX.key.length).padStart(2, "0")}${PIX.key}`,
    );
    expect(view!.brCode).toContain("5406100.00");
    expect(view!.brCode.slice(-4)).toBe(crc16(view!.brCode.slice(0, -4)));
  });

  it("[PIX-FR-004] sem fatura aberta (não passou por [5d]) não há Pix para mostrar", async () => {
    await configurePix(t.db);
    const a = await storeOwner(t.db, "loja-a", "a@x.com");

    expect(await pixView(deps(), a)).toBeNull();
  });

  it("[PIX-SEC-001] [PIX-SEC-002] o envio é assinado na pasta privada da loja da sessão, com PDF", async () => {
    // Arrange
    await configurePix(t.db);
    const a = await readyToPay();
    const b = await readyToPay("loja-b", "b@x.com");

    // Act
    const signedA = await receiptUpload(deps(), a);
    const signedB = await receiptUpload(deps(), b);

    // Assert
    expect(signedA.fields).toMatchObject({
      folder: `staging/receipts/${a.storeId}`,
      type: "authenticated",
      allowed_formats: "jpg,png,webp,heic,pdf",
    });
    expect(signedA.fields.public_id).toMatch(/^receipt-[0-9a-f-]{36}$/);
    expect(signedB.fields.folder).toBe(`staging/receipts/${b.storeId}`);
  });

  it("[PIX-FR-006] sem fatura aberta, ou já em análise, não assina envio", async () => {
    await configurePix(t.db);
    const a = await storeOwner(t.db, "loja-a", "a@x.com");
    await expect(receiptUpload(deps(), a)).rejects.toMatchObject({
      status: 409,
    });

    const b = await readyToPay("loja-b", "b@x.com");
    await t.db.update(stores).set({ status: "payment_review" });
    await expect(receiptUpload(deps(), b)).rejects.toMatchObject({
      status: 409,
    });
  });

  it("[PIX-SEC-006] usuário da loja não vê o Pix nem envia comprovante", async () => {
    await configurePix(t.db);
    const a = await readyToPay();
    const staff = await personWith(t.db, "store_staff", a.storeId);

    await expect(pixView(deps(), staff)).rejects.toMatchObject({ status: 403 });
    await expect(receiptUpload(deps(), staff)).rejects.toMatchObject({
      status: 403,
    });
  });
});
