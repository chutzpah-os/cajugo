import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { activityLog, partnerships, sales, stores } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { personWith } from "@/domains/billing/testing/fixtures";
import { car, liveStore } from "@/domains/showcase/testing/fixtures";
import { setNetworkRules, storeNetwork } from "./service";
import { activeSeller, acceptSellers } from "./testing/fixtures";

const at = (iso: string) => new Date(iso);

describe("Rede Caju da loja [7e] [7f]", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    t = await createTestDb();
  });
  afterEach(async () => {
    await t.close();
  });

  it("[RCL-FR-001] [RCL-FR-002] liga 'Aceitar vendedores' e define a comissão padrão; fica no registro", async () => {
    // Arrange
    const a = await liveStore(t.db, "loja-a");

    // Act
    await setNetworkRules(t.db, a, {
      acceptsSellers: true,
      commissionType: "pct",
      commissionValue: 200,
    });
    const view = await storeNetwork(t.db, a);

    // Assert
    expect(view).toMatchObject({
      acceptsSellers: true,
      commission: { type: "pct", value: 200 },
    });
    const log = await t.db.select().from(activityLog);
    expect(log.map((l) => l.action)).toContain("store.network_rules");
  });

  it("[RCL-FR-004] [RCL-FR-007] pedidos pendentes do mais antigo, só de vendedor ativo", async () => {
    // Arrange
    const a = await liveStore(t.db, "loja-a");
    await acceptSellers(t.db, a.storeId);
    const ana = await activeSeller(t.db, "ANA", { name: "Ana" });
    const beto = await activeSeller(t.db, "BETO", { name: "Beto" });
    const bloq = await activeSeller(t.db, "BLOQ", {
      name: "Bloq",
      status: "blocked",
      blockedReason: "x",
    });
    await t.db.insert(partnerships).values([
      {
        sellerId: beto.userId,
        storeId: a.storeId,
        origin: "request",
        createdAt: at("2026-11-16T10:00:00Z"),
      },
      {
        sellerId: ana.userId,
        storeId: a.storeId,
        origin: "request",
        createdAt: at("2026-11-15T10:00:00Z"),
      },
      {
        sellerId: bloq.userId,
        storeId: a.storeId,
        origin: "request",
        createdAt: at("2026-11-14T10:00:00Z"),
      },
    ]);

    // Act
    const view = await storeNetwork(t.db, a);

    // Assert
    expect(view.pending.map((p) => p.sellerName)).toEqual(["Ana", "Beto"]);
    expect(view.pending[0]).toMatchObject({
      city: "Aracaju",
      requestedAt: at("2026-11-15T10:00:00Z"),
    });
  });

  it("[RCL-FR-006] [RCL-FR-007] [RCL-SEC-004] parceiros com celular, Pix, vendas e o selo de bloqueado; sem CPF", async () => {
    // Arrange
    const a = await liveStore(t.db, "loja-a");
    await acceptSellers(t.db, a.storeId);
    const ana = await activeSeller(t.db, "ANA", { name: "Ana" });
    const bloq = await activeSeller(t.db, "BLOQ", {
      name: "Bloq",
      status: "blocked",
      blockedReason: "x",
    });
    for (const s of [ana, bloq])
      await t.db.insert(partnerships).values({
        sellerId: s.userId,
        storeId: a.storeId,
        origin: "request",
        status: "active",
      });
    const v = await car(t.db, a.storeId, { status: "sold" });
    await t.db.insert(sales).values({
      vehicleId: v.id,
      storeId: a.storeId,
      finalPriceCents: 1,
      attribution: "link",
      sellerId: ana.userId,
      confirmedBy: a.userId,
    });

    // Act
    const view = await storeNetwork(t.db, a);

    // Assert
    expect(view.partners).toEqual([
      expect.objectContaining({
        sellerName: "Ana",
        phone: "5579999990000",
        pixKey: `${ana.userId}@x.com`,
        sales: 1,
        blocked: false,
      }),
      expect.objectContaining({ sellerName: "Bloq", sales: 0, blocked: true }),
    ]);
    expect(JSON.stringify(view)).not.toMatch(/"cpf"/);
  });

  it("[RCL-SEC-001] [RCL-SEC-002] loja B não vê os parceiros da A; usuário da loja e vendedor não abrem", async () => {
    // Arrange
    const a = await liveStore(t.db, "loja-a");
    const b = await liveStore(t.db, "loja-b");
    const ana = await activeSeller(t.db, "ANA");
    await t.db.insert(partnerships).values({
      sellerId: ana.userId,
      storeId: a.storeId,
      origin: "request",
      status: "active",
    });
    const staff = await personWith(t.db, "store_staff", a.storeId);

    // Act / Assert
    expect((await storeNetwork(t.db, b)).partners).toEqual([]);
    for (const who of [staff, ana]) {
      await expect(storeNetwork(t.db, who)).rejects.toMatchObject({
        status: 403,
      });
      await expect(
        setNetworkRules(t.db, who, {
          acceptsSellers: true,
          commissionType: null,
          commissionValue: null,
        }),
      ).rejects.toMatchObject({ status: 403 });
    }
    const [store] = await t.db
      .select()
      .from(stores)
      .where(eq(stores.id, a.storeId));
    expect(store.acceptsSellers).toBe(false);
  });
});
