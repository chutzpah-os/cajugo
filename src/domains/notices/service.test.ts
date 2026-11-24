import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { notices, profiles } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { uuidv7 } from "@/platform/db/uuid";
import type { Session } from "@/platform/http/session";
import { dismissNotice, noticesFor, notify } from "./service";

describe("avisos no painel", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;

  async function person(email: string): Promise<Session> {
    const id = uuidv7();
    await t.db.insert(profiles).values({ id, email, name: email });
    return {
      userId: id,
      roles: ["store_owner"],
      activeRole: "store_owner",
      storeId: null,
      mustChangePassword: false,
    };
  }

  beforeEach(async () => {
    t = await createTestDb();
  });
  afterEach(() => t.close());

  it("[PIX-FR-013] o lojista vê os avisos dele, do mais recente ao mais antigo, com a frase pronta", async () => {
    // Arrange
    const a = await person("a@x.com");
    await notify(
      t.db,
      a.userId,
      {
        kind: "payment_rejected",
        reason: "Valor divergente",
        missingCents: 1000,
      },
      new Date("2026-11-08T10:00:00Z"),
    );
    await notify(
      t.db,
      a.userId,
      { kind: "payment_confirmed" },
      new Date("2026-11-08T11:00:00Z"),
    );

    // Act
    const list = await noticesFor(t.db, a);

    // Assert
    expect(list.map((n) => n.text)).toEqual([
      "Pagamento confirmado. Sua loja está no ar.",
      "Comprovante recusado: Valor divergente. Faltam R$ 10,00.",
    ]);
    expect(list[1].tone).toBe("alert");
  });

  it("[PIX-FR-013] dispensado não aparece mais", async () => {
    const a = await person("a@x.com");
    await notify(t.db, a.userId, { kind: "payment_confirmed" });
    const [n] = await noticesFor(t.db, a);

    await dismissNotice(t.db, a, n.id);

    expect(await noticesFor(t.db, a)).toEqual([]);
  });

  it("[PIX-SEC-001] ninguém vê nem dispensa o aviso de outra pessoa", async () => {
    // Arrange
    const a = await person("a@x.com");
    const b = await person("b@x.com");
    await notify(t.db, a.userId, { kind: "payment_confirmed" });
    const [n] = await noticesFor(t.db, a);

    // Act + Assert
    expect(await noticesFor(t.db, b)).toEqual([]);
    await expect(dismissNotice(t.db, b, n.id)).rejects.toMatchObject({
      status: 404,
    });
    const [row] = await t.db.select().from(notices);
    expect(row.dismissedAt).toBeNull();
    await expect(noticesFor(t.db, null)).rejects.toMatchObject({ status: 401 });
  });

  it("[PIX-SEC-001] id inválido ao dispensar é 404", async () => {
    const a = await person("a@x.com");

    await expect(dismissNotice(t.db, a, "nao-e-uuid")).rejects.toMatchObject({
      status: 404,
    });
  });

  it("[SUB-FR-006] [SUB-FR-015] frases do ciclo de cobrança para o lojista e para o admin", async () => {
    // Arrange
    const a = await person("a@x.com");
    const at = (m: number) => new Date(Date.UTC(2026, 11, 7, 10, m));
    await notify(
      t.db,
      a.userId,
      { kind: "invoice_due", due: "10/12", totalCents: 60000 },
      at(0),
    );
    await notify(t.db, a.userId, { kind: "store_suspended" }, at(1));
    await notify(t.db, a.userId, { kind: "store_reactivated" }, at(2));
    await notify(
      t.db,
      a.userId,
      { kind: "store_reactivated", byAdmin: true },
      at(3),
    );
    await notify(
      t.db,
      a.userId,
      { kind: "store_suspended", store: "Loja A" },
      at(4),
    );

    // Act
    const texts = (await noticesFor(t.db, a)).map((n) => n.text).reverse();

    // Assert
    expect(texts).toEqual([
      "Sua fatura vence em 10/12 · R$ 600,00.",
      "Sua loja foi suspensa por falta de pagamento.",
      "Pagamento confirmado. Sua loja está no ar.",
      "Sua loja voltou ao ar. A fatura continua em aberto.",
      "A loja Loja A foi suspensa por falta de pagamento.",
    ]);
  });

  it("[EXT-FR-006] [EXT-FR-010] frases do extrato: venda confirmada ao vendedor; Recebi e desfazer à loja", async () => {
    // Arrange
    const a = await person("v@x.com");
    const at = (m: number) => new Date(Date.UTC(2026, 10, 23, 10, m));
    await notify(
      t.db,
      a.userId,
      {
        kind: "sale_confirmed",
        vehicle: "Fiat Argo",
        store: "Loja A",
        commissionCents: 116000,
      },
      at(0),
    );
    await notify(
      t.db,
      a.userId,
      { kind: "commission_received", seller: "Ana", vehicle: "Fiat Argo" },
      at(1),
    );
    await notify(
      t.db,
      a.userId,
      { kind: "commission_unreceived", seller: "Ana", vehicle: "Fiat Argo" },
      at(2),
    );

    // Act
    const texts = (await noticesFor(t.db, a)).map((n) => n.text).reverse();

    // Assert
    expect(texts).toEqual([
      "Venda confirmada: Fiat Argo na Loja A · comissão R$ 1.160,00",
      "Ana confirmou o recebimento da comissão do Fiat Argo.",
      "Ana desfez o recebimento da comissão do Fiat Argo.",
    ]);
  });

  it("[IND-FR-016] frases do Caju Indica: indicação ativa e recompensa (crédito ou saldo)", async () => {
    // Arrange
    const a = await person("r@x.com");
    const at = (m: number) => new Date(Date.UTC(2026, 10, 23, 10, m));
    await notify(
      t.db,
      a.userId,
      { kind: "referral_active", store: "Loja Boa", amountCents: 3000 },
      at(0),
    );
    await notify(
      t.db,
      a.userId,
      {
        kind: "referral_reward",
        store: "Loja Boa",
        amountCents: 3000,
        target: "credit",
      },
      at(1),
    );
    await notify(
      t.db,
      a.userId,
      {
        kind: "referral_reward",
        store: "Loja Boa",
        amountCents: 3000,
        target: "balance",
      },
      at(2),
    );

    // Act
    const texts = (await noticesFor(t.db, a)).map((n) => n.text).reverse();

    // Assert
    expect(texts).toEqual([
      "Sua indicação Loja Boa está ativa. Você ganhou R$ 30,00.",
      "Você ganhou R$ 30,00 de crédito na sua fatura pela indicação Loja Boa.",
      "Você ganhou R$ 30,00 de saldo pela indicação Loja Boa.",
    ]);
  });
});
