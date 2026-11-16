import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { activityLog } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { personWith, storeOwner } from "@/domains/billing/testing/fixtures";
import { approve, block, sellersAdmin, unblock } from "./service";
import { activeSeller, seller, sellerRow } from "./testing/fixtures";

const NOW = new Date("2026-11-16T12:00:00Z");
const DOCS = {
  documentFrontPublicId: "f",
  documentFrontFormat: "jpg",
  documentBackPublicId: "b",
  documentBackFormat: "jpg",
};
const at = (iso: string) => new Date(iso);

describe("curadoria dos vendedores [7h]", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    t = await createTestDb();
  });
  afterEach(async () => {
    await t.close();
  });

  it("[SEL-FR-003] indicadores e listas: em análise do mais antigo, ativos e bloqueados, com CPF completo", async () => {
    // Arrange
    const novo = await seller(t.db, {
      name: "Novo",
      createdAt: at("2026-11-15T10:00:00Z"),
    });
    const antigo = await seller(t.db, {
      name: "Antigo",
      createdAt: at("2026-11-10T10:00:00Z"),
    });
    await activeSeller(t.db, "ATIVO", { name: "Ativo" });
    await activeSeller(t.db, "BLOQ", {
      name: "Bloq",
      status: "blocked",
      blockedReason: "x",
    });
    const support = await personWith(t.db, "support");

    // Act
    const view = await sellersAdmin(t.db, support);

    // Assert
    expect(view.counts).toEqual({ in_review: 2, active: 1, blocked: 1 });
    expect(view.inReview.map((s) => s.sellerId)).toEqual([
      antigo.userId,
      novo.userId,
    ]);
    expect(view.inReview[0]).toMatchObject({
      name: "Antigo",
      city: "Aracaju",
      phone: "5579999990000",
      cpf: expect.stringMatching(/^\d{11}$/),
      hasDocuments: false,
    });
    expect(view.active.map((s) => s.name)).toEqual(["Ativo"]);
    expect(view.blocked[0]).toMatchObject({ name: "Bloq", blockedReason: "x" });
  });

  it("[SEL-FR-004] aprovar gera o código; sem as duas fotos não aprova", async () => {
    // Arrange
    const ana = await seller(t.db, { name: "Ana Souza", ...DOCS });
    const ana2 = await seller(t.db, { name: "Ana Lima", ...DOCS });
    const semFoto = await seller(t.db, { name: "Caio" });
    const admin = await personWith(t.db, "admin");

    // Act
    const ok = await approve(t.db, admin, { sellerId: ana.userId }, NOW);
    await approve(t.db, admin, { sellerId: ana2.userId }, NOW);
    const again = await approve(t.db, admin, { sellerId: ana.userId }, NOW);

    // Assert
    expect(ok).toBe(true);
    expect(again).toBe(false);
    expect(await sellerRow(t.db, ana.userId)).toMatchObject({
      status: "active",
      code: "ANA",
      decidedBy: admin.userId,
      approvedAt: NOW,
    });
    expect((await sellerRow(t.db, ana2.userId)).code).toBe("ANA10");
    await expect(
      approve(t.db, admin, { sellerId: semFoto.userId }, NOW),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("[SEL-FR-005] bloquear pede motivo; desbloquear volta para ativo", async () => {
    // Arrange
    const ana = await activeSeller(t.db, "ANA");
    const admin = await personWith(t.db, "admin");

    // Act / Assert
    await expect(
      block(t.db, admin, { sellerId: ana.userId, reason: "" }),
    ).rejects.toMatchObject({ status: 422 });
    expect(
      await block(t.db, admin, {
        sellerId: ana.userId,
        reason: "Cobrou sinal por fora",
      }),
    ).toBe(true);
    expect(await sellerRow(t.db, ana.userId)).toMatchObject({
      status: "blocked",
      blockedReason: "Cobrou sinal por fora",
      code: "ANA",
    });
    expect(await unblock(t.db, admin, { sellerId: ana.userId })).toBe(true);
    expect(await sellerRow(t.db, ana.userId)).toMatchObject({
      status: "active",
      blockedReason: null,
    });
  });

  it("[SEL-SEC-005] suporte vê mas não decide; lojista, vendedor e indicador nem veem", async () => {
    // Arrange
    const ana = await seller(t.db, DOCS);
    const support = await personWith(t.db, "support");
    const others = [
      await storeOwner(t.db, "loja-a", "a@x.com"),
      await activeSeller(t.db, "BETO"),
      await personWith(t.db, "referrer"),
    ];

    // Act / Assert
    await expect(
      approve(t.db, support, { sellerId: ana.userId }, NOW),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      unblock(t.db, support, { sellerId: ana.userId }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      block(t.db, support, { sellerId: ana.userId, reason: "abc" }),
    ).rejects.toMatchObject({ status: 403 });
    for (const p of others) {
      await expect(sellersAdmin(t.db, p)).rejects.toMatchObject({
        status: 403,
      });
      await expect(
        approve(t.db, p, { sellerId: ana.userId }, NOW),
      ).rejects.toMatchObject({ status: 403 });
    }
    expect((await sellerRow(t.db, ana.userId)).status).toBe("in_review");
  });

  it("[SEL-SEC-007] decisões no registro com quem decidiu e o motivo, sem CPF nem Pix", async () => {
    // Arrange
    const ana = await seller(t.db, DOCS);
    const admin = await personWith(t.db, "admin");

    // Act
    await approve(t.db, admin, { sellerId: ana.userId }, NOW);
    await block(t.db, admin, {
      sellerId: ana.userId,
      reason: "Cobrou sinal por fora",
    });
    await unblock(t.db, admin, { sellerId: ana.userId });

    // Assert
    const log = await t.db.select().from(activityLog);
    const decisions = log.filter((l) => l.entity === "seller");
    expect(decisions.map((l) => l.action)).toEqual([
      "seller.approved",
      "seller.blocked",
      "seller.unblocked",
    ]);
    expect(decisions[1]).toMatchObject({
      userId: admin.userId,
      entityId: ana.userId,
      data: { reason: "Cobrou sinal por fora" },
    });
    const { profiles } = await import("@/platform/db/schema");
    const { eq } = await import("drizzle-orm");
    const [p] = await t.db
      .select()
      .from(profiles)
      .where(eq(profiles.id, ana.userId));
    const json = JSON.stringify(log);
    expect(json).not.toContain(p.cpf!);
    expect(json).not.toContain(p.pixKey!);
  });
});
