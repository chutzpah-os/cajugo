import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { rateLimits, vehicleReports } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { uuidv7 } from "@/platform/db/uuid";
import { car, liveStore } from "@/domains/showcase/testing/fixtures";
import { reportVehicle } from "./service";

const NOW = new Date("2026-11-16T10:00:00Z");
const ctx = { ipHash: "ip-1", now: NOW };
const form = (vehicleId: string, over: Record<string, unknown> = {}) => ({
  requestId: uuidv7(),
  vehicleId,
  reason: "wrong_photos",
  details: "A placa da foto é de outro veículo",
  website: "",
  ...over,
});

describe("denunciar anúncio", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    t = await createTestDb();
  });
  afterEach(async () => {
    await t.close();
  });

  it("[RPT-FR-001] grava a denúncia aberta do veículo, com motivo e descrição", async () => {
    // Arrange
    const { storeId } = await liveStore(t.db, "loja-a");
    const v = await car(t.db, storeId);

    // Act
    const r = await reportVehicle(t.db, form(v.id), ctx);

    // Assert
    expect(r).toEqual({ ok: true });
    expect(await t.db.select().from(vehicleReports)).toEqual([
      expect.objectContaining({
        vehicleId: v.id,
        reason: "wrong_photos",
        details: "A placa da foto é de outro veículo",
        status: "open",
        decidedBy: null,
        createdAt: NOW,
      }),
    ]);
  });

  it("[RPT-FR-001] o mesmo envio repetido cria uma denúncia só; descrição vazia fica nula", async () => {
    // Arrange
    const { storeId } = await liveStore(t.db, "loja-a");
    const v = await car(t.db, storeId);
    const once = form(v.id, { details: "  " });

    // Act
    await reportVehicle(t.db, once, ctx);
    await reportVehicle(t.db, once, ctx);

    // Assert
    const rows = await t.db.select().from(vehicleReports);
    expect(rows).toHaveLength(1);
    expect(rows[0].details).toBeNull();
  });

  it("[RPT-FR-001] sem motivo é recusada no campo; veículo fora do ar é recusado", async () => {
    // Arrange
    const { storeId } = await liveStore(t.db, "loja-a");
    const sold = await car(t.db, storeId, { status: "sold" });
    const v = await car(t.db, storeId);

    // Act
    const noReason = await reportVehicle(t.db, form(v.id, { reason: "" }), ctx);
    const offAir = await reportVehicle(t.db, form(sold.id), ctx);

    // Assert
    expect(noReason).toMatchObject({
      ok: false,
      errors: [expect.objectContaining({ field: "reason" })],
    });
    expect(offAir).toMatchObject({ ok: false });
    expect(await t.db.select().from(vehicleReports)).toEqual([]);
  });

  it("[RPT-SEC-002] honeypot finge sucesso sem gravar; o 6º envio do IP no minuto é recusado", async () => {
    // Arrange
    const { storeId } = await liveStore(t.db, "loja-a");
    const v = await car(t.db, storeId);

    // Act
    const trap = await reportVehicle(
      t.db,
      form(v.id, { website: "http://spam" }),
      { ...ctx, ipHash: "ip-bot" },
    );
    const results = [];
    for (let i = 0; i < 6; i++)
      results.push(await reportVehicle(t.db, form(v.id), ctx));

    // Assert
    expect(trap).toEqual({ ok: true });
    expect(results.slice(0, 5).every((r) => r.ok)).toBe(true);
    expect(results[5]).toMatchObject({
      ok: false,
      message: expect.stringContaining("Muitas tentativas"),
    });
    expect(await t.db.select().from(vehicleReports)).toHaveLength(5);
  });

  it("[RPT-SEC-006] a denúncia não guarda quem denunciou; o IP só aparece como hash no limite", async () => {
    // Arrange
    const { storeId } = await liveStore(t.db, "loja-a");
    const v = await car(t.db, storeId);

    // Act
    await reportVehicle(t.db, form(v.id), { ...ctx, ipHash: "hash-xyz" });

    // Assert
    const [row] = await t.db.select().from(vehicleReports);
    expect(JSON.stringify(row)).not.toContain("hash-xyz");
    const keys = (await t.db.select().from(rateLimits))
      .map((r) => r.key)
      .filter((k) => k.includes("hash-xyz"))
      .sort();
    expect(keys).toEqual(["report:ip:hash-xyz:60", "report:ip:hash-xyz:86400"]);
  });
});
