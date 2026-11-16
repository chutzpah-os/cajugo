import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { leads } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { car, liveStore } from "@/domains/showcase/testing/fixtures";
import { contactStore } from "./service";

const NOW = new Date("2026-11-16T10:00:00Z");
const ctx = { ipHash: "ip-1", now: NOW };
const form = (vehicleId: string, over: Record<string, unknown> = {}) => ({
  vehicleId,
  origin: "cajugo",
  name: "Ana",
  email: "ana@exemplo.com",
  phone: "(79) 99999-0000",
  message: "Olá, tenho interesse no veículo. Por favor entre em contato.",
  website: "",
  ...over,
});

describe("mensagem à loja", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    t = await createTestDb();
  });
  afterEach(async () => {
    await t.close();
  });

  it("[LED-FR-001] cria um lead Novo na loja do veículo, com a mensagem", async () => {
    // Arrange
    const { storeId } = await liveStore(t.db, "loja-a");
    const v = await car(t.db, storeId);

    // Act
    const r = await contactStore(t.db, form(v.id), ctx);

    // Assert
    expect(r).toEqual({ ok: true });
    expect(await t.db.select().from(leads)).toEqual([
      expect.objectContaining({
        storeId,
        vehicleId: v.id,
        channel: "form",
        origin: "cajugo",
        status: "new",
        name: "Ana",
        email: "ana@exemplo.com",
        phone: "5579999990000",
        message: "Olá, tenho interesse no veículo. Por favor entre em contato.",
        createdAt: NOW,
      }),
    ]);
  });

  it("[LED-FR-004] veículo não divulgado na CajuGo é sempre Seu catálogo", async () => {
    // Arrange
    const { storeId } = await liveStore(t.db, "loja-a");
    const shared = await car(t.db, storeId);
    const catalogOnly = await car(t.db, storeId, { shareOnCajugo: false });

    // Act
    await contactStore(t.db, form(shared.id, { origin: "store_catalog" }), ctx);
    await contactStore(t.db, form(catalogOnly.id, { origin: "cajugo" }), {
      ...ctx,
      ipHash: "ip-2",
    });

    // Assert
    const rows = await t.db.select().from(leads);
    const originOf = (id: string) =>
      rows.find((r) => r.vehicleId === id)?.origin;
    expect(originOf(shared.id)).toBe("store_catalog");
    expect(originOf(catalogOnly.id)).toBe("store_catalog");
  });

  it("[LED-FR-001] veículo fora do ar não recebe mensagem", async () => {
    // Arrange
    const { storeId } = await liveStore(t.db, "loja-a");
    const sold = await car(t.db, storeId, { status: "sold" });

    // Act
    const r = await contactStore(t.db, form(sold.id), ctx);

    // Assert
    expect(r).toMatchObject({ ok: false });
    expect(await t.db.select().from(leads)).toEqual([]);
  });

  it("[LED-FR-002] [LED-SEC-004] campos inválidos voltam por campo, sem lead", async () => {
    // Arrange
    const { storeId } = await liveStore(t.db, "loja-a");
    const v = await car(t.db, storeId);

    // Act
    const r = await contactStore(
      t.db,
      form(v.id, { email: "ana@", message: "a".repeat(1001) }),
      ctx,
    );

    // Assert
    expect(r).toMatchObject({
      ok: false,
      errors: expect.arrayContaining([
        expect.objectContaining({ field: "email" }),
        expect.objectContaining({ field: "message" }),
      ]),
    });
    expect(await t.db.select().from(leads)).toEqual([]);
  });

  it("[LED-SEC-002] honeypot finge sucesso sem lead; o 6º envio do IP no minuto é recusado", async () => {
    // Arrange
    const { storeId } = await liveStore(t.db, "loja-a");
    const v = await car(t.db, storeId);

    // Act
    const bot = await contactStore(
      t.db,
      form(v.id, { website: "http://spam" }),
      { ...ctx, ipHash: "robo" },
    );
    const results = [];
    for (let i = 0; i < 6; i++)
      results.push(await contactStore(t.db, form(v.id), ctx));

    // Assert
    expect(bot).toEqual({ ok: true });
    expect(results.slice(0, 5).every((r) => r.ok)).toBe(true);
    expect(results[5]).toMatchObject({
      ok: false,
      message: expect.stringContaining("Muitas tentativas"),
    });
    expect(await t.db.select().from(leads)).toHaveLength(5);
  });
});
