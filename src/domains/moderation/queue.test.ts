import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { vehicles } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { personWith } from "@/domains/billing/testing/fixtures";
import { car, liveStore } from "@/domains/showcase/testing/fixtures";
import { openReportsCount, reportQueue } from "./service";
import { report } from "./testing/fixtures";

const at = (iso: string) => new Date(iso);

describe("fila de denúncias [14e]", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    t = await createTestDb();
  });
  afterEach(async () => {
    await t.close();
  });

  it("[RPT-FR-002] um card por anúncio, da denúncia mais antiga, com contagem por motivo e descrições", async () => {
    // Arrange
    const a = await liveStore(t.db, "loja-a");
    const b = await liveStore(t.db, "loja-b");
    const argo = await car(t.db, a.storeId, { make: "Fiat", model: "ARGO" });
    const onix = await car(t.db, b.storeId);
    await report(t.db, onix.id, { createdAt: at("2026-11-15T09:00:00Z") });
    await report(t.db, argo.id, {
      reason: "unreal_price",
      details: "Metade da FIPE",
      createdAt: at("2026-11-15T10:00:00Z"),
    });
    await report(t.db, argo.id, {
      reason: "scam",
      details: "Pediu sinal por Pix",
      createdAt: at("2026-11-15T11:00:00Z"),
    });
    await report(t.db, argo.id, { status: "kept" });
    const admin = await personWith(t.db, "admin");

    // Act
    const queue = await reportQueue(t.db, admin);

    // Assert
    expect(queue.map((c) => c.vehicle.id)).toEqual([onix.id, argo.id]);
    expect(queue[1]).toMatchObject({
      open: 2,
      byReason: [
        { reason: "unreal_price", count: 1 },
        { reason: "scam", count: 1 },
      ],
      details: ["Metade da FIPE", "Pediu sinal por Pix"],
      firstAt: at("2026-11-15T10:00:00Z"),
      vehicle: {
        id: argo.id,
        title: "Fiat ARGO",
        storeName: "Loja loja-a",
        priceCents: 5000000,
        path: expect.stringContaining(argo.id),
      },
    });
  });

  it("[RPT-FR-002] anúncio vendido sai da fila e volta com a mesma denúncia ao desfazer a venda", async () => {
    // Arrange
    const a = await liveStore(t.db, "loja-a");
    const v = await car(t.db, a.storeId);
    await report(t.db, v.id);
    const admin = await personWith(t.db, "support");
    const setStatus = (status: "sold" | "published") =>
      t.db.update(vehicles).set({ status }).where(eq(vehicles.id, v.id));

    // Act
    await setStatus("sold");
    const whileSold = await reportQueue(t.db, admin);
    await setStatus("published");
    const back = await reportQueue(t.db, admin);

    // Assert
    expect(whileSold).toEqual([]);
    expect(back).toMatchObject([{ vehicle: { id: v.id }, open: 1 }]);
  });

  it("[RPT-FR-007] o contador do menu conta anúncios na fila", async () => {
    // Arrange
    const a = await liveStore(t.db, "loja-a");
    const v1 = await car(t.db, a.storeId);
    const v2 = await car(t.db, a.storeId);
    const sold = await car(t.db, a.storeId, { status: "sold" });
    await report(t.db, v1.id);
    await report(t.db, v1.id);
    await report(t.db, v2.id);
    await report(t.db, sold.id);
    const admin = await personWith(t.db, "admin");

    // Act / Assert
    expect(await openReportsCount(t.db, admin)).toBe(2);
  });

  it("[RPT-SEC-003] lojista, usuário da loja e vendedor não veem a fila; o contador é 0", async () => {
    // Arrange
    const a = await liveStore(t.db, "loja-a");
    const v = await car(t.db, a.storeId);
    await report(t.db, v.id);
    const people = [
      await personWith(t.db, "store_owner", a.storeId),
      await personWith(t.db, "store_staff", a.storeId),
      await personWith(t.db, "seller"),
    ];

    // Act / Assert
    for (const p of people) {
      await expect(reportQueue(t.db, p)).rejects.toMatchObject({ status: 403 });
      expect(await openReportsCount(t.db, p)).toBe(0);
    }
    await expect(reportQueue(t.db, null)).rejects.toMatchObject({
      status: 401,
    });
  });
});
