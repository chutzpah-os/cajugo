import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { invoices, settingValues } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { checkoutView, startCheckout } from "./service";
import {
  configurePix,
  personWith,
  storeOwner,
  storeRow,
} from "./testing/fixtures";

const NOW = new Date("2026-11-08T12:00:00Z");

describe("tela de pagamento [5d]", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  let now: Date;
  const deps = () => ({ db: t.db, now: () => now });

  beforeEach(async () => {
    vi.stubEnv("HASH_SECRET", "segredo-de-teste");
    t = await createTestDb();
    now = NOW;
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await t.close();
  });

  it("[PIX-FR-001] mostra o plano com a mensalidade das regras e o nome da loja", async () => {
    // Arrange
    const a = await storeOwner(t.db, "silva-autocar", "a@x.com");
    await configurePix(t.db);

    // Act
    const view = await checkoutView(deps(), a);

    // Assert
    expect(view).toMatchObject({
      storeName: "Loja silva-autocar",
      membershipCents: 10000,
      taxId: null,
      pixReady: true,
      lastRejection: null,
    });
  });

  it("[PIX-FR-001] mudança da mensalidade vale para quem abre depois; fatura já aberta mantém o valor", async () => {
    // Arrange
    const a = await storeOwner(t.db, "loja-a", "a@x.com");
    const b = await storeOwner(t.db, "loja-b", "b@x.com");
    await configurePix(t.db);
    await startCheckout(deps(), a, { taxId: "529.982.247-25" });

    // Act
    await t.db.insert(settingValues).values({
      key: "membership_cents",
      value: 12000,
      validFrom: new Date("2026-11-08T13:00:00Z"),
    });
    now = new Date("2026-11-08T14:00:00Z");

    // Assert
    expect((await checkoutView(deps(), b)).membershipCents).toBe(12000);
    expect((await checkoutView(deps(), a)).membershipCents).toBe(10000);
  });

  it("[PIX-FR-002] [PIX-SEC-005] CPF ou CNPJ válido é gravado na loja e aparece mascarado; abre a 1ª mensalidade", async () => {
    // Arrange
    const a = await storeOwner(t.db, "loja-a", "a@x.com");
    await configurePix(t.db);

    // Act
    await startCheckout(deps(), a, { taxId: "12.345.678/0001-95" });
    await startCheckout(deps(), a, { taxId: "12.345.678/0001-95" });

    // Assert
    const store = await storeRow(t.db, a.storeId);
    expect(store).toMatchObject({ taxId: "12345678000195", taxIdType: "cnpj" });
    expect((await checkoutView(deps(), a)).taxId).toEqual({
      type: "cnpj",
      masked: "12.***.***/0001-95",
    });
    const open = await t.db
      .select()
      .from(invoices)
      .where(eq(invoices.storeId, a.storeId));
    expect(open).toHaveLength(1);
    expect(open[0]).toMatchObject({
      kind: "first",
      status: "open",
      membershipCents: 10000,
      totalCents: 10000,
    });
  });

  it("[PIX-FR-002] documento inválido mostra o erro e não grava nada", async () => {
    const a = await storeOwner(t.db, "loja-a", "a@x.com");
    await configurePix(t.db);

    for (const [taxId, message] of [
      ["111.111.111-11", "CPF inválido."],
      ["12.345.678/0001-94", "CNPJ inválido."],
      ["123", "Informe um CPF ou CNPJ."],
    ])
      await expect(startCheckout(deps(), a, { taxId })).rejects.toMatchObject({
        status: 422,
        errors: [expect.objectContaining({ field: "taxId", message })],
      });
    expect((await storeRow(t.db, a.storeId)).taxId).toBeNull();
    expect(await t.db.select().from(invoices)).toHaveLength(0);
  });

  it("[PIX-FR-004] sem chave Pix nas regras, a tela avisa com o WhatsApp de atendimento e não deixa seguir", async () => {
    const a = await storeOwner(t.db, "loja-a", "a@x.com");

    const view = await checkoutView(deps(), a);

    expect(view.pixReady).toBe(false);
    expect(view.supportUrl).toMatch(/^https:\/\/wa\.me\/557981360206\?text=/);
    await expect(
      startCheckout(deps(), a, { taxId: "529.982.247-25" }),
    ).rejects.toMatchObject({
      status: 409,
      detail: "O pagamento está indisponível no momento. Fale com a CajuGo.",
    });
  });

  it("[PIX-SEC-004] a entrada não aceita loja, fatura nem valor", async () => {
    const a = await storeOwner(t.db, "loja-a", "a@x.com");
    await configurePix(t.db);

    await expect(
      startCheckout(deps(), a, {
        taxId: "529.982.247-25",
        storeId: crypto.randomUUID(),
        totalCents: 1,
      }),
    ).rejects.toMatchObject({ status: 422 });
    expect(await t.db.select().from(invoices)).toHaveLength(0);
  });

  it("[PIX-SEC-006] usuário da loja não vê nem inicia o pagamento; visitante precisa entrar", async () => {
    const a = await storeOwner(t.db, "loja-a", "a@x.com");
    await configurePix(t.db);
    const staff = await personWith(t.db, "store_staff", a.storeId);

    await expect(checkoutView(deps(), staff)).rejects.toMatchObject({
      status: 403,
    });
    await expect(
      startCheckout(deps(), staff, { taxId: "529.982.247-25" }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(checkoutView(deps(), null)).rejects.toMatchObject({
      status: 401,
    });
  });

  it("[PIX-FR-010] no reenvio, documento em branco reaproveita o já informado", async () => {
    const a = await storeOwner(t.db, "loja-a", "a@x.com");
    await configurePix(t.db);
    await startCheckout(deps(), a, { taxId: "529.982.247-25" });

    await startCheckout(deps(), a, { taxId: "" });
    await startCheckout(deps(), a, {});

    expect((await storeRow(t.db, a.storeId)).taxId).toBe("52998224725");
    const b = await storeOwner(t.db, "loja-b", "b@x.com");
    await expect(startCheckout(deps(), b, { taxId: "" })).rejects.toMatchObject(
      {
        status: 422,
        errors: [expect.objectContaining({ field: "taxId" })],
      },
    );
  });
});
