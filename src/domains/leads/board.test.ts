import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { leads, vehicles } from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";
import { createTestDb } from "@/platform/db/testing/test-db";
import { personWith } from "@/domains/billing/testing/fixtures";
import { car, liveStore } from "@/domains/showcase/testing/fixtures";
import { leadsBoard, newLeadsCount } from "./service";

const NOW = new Date("2026-11-16T12:00:00Z");
const HOUR = 3_600_000;
const ago = (h: number) => new Date(NOW.getTime() - h * HOUR);

type Lead = typeof leads.$inferInsert;
async function lead(
  db: Db,
  over: Partial<Lead> & Pick<Lead, "storeId" | "vehicleId">,
) {
  const [row] = await db
    .insert(leads)
    .values({
      channel: "form",
      origin: "cajugo",
      status: "new",
      name: "Ana Souza",
      email: "ana@exemplo.com",
      phone: "5579999990000",
      message: "Olá",
      createdAt: ago(1),
      ...over,
    })
    .returning({ id: leads.id });
  return row.id;
}

describe("tela Leads", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    t = await createTestDb();
  });
  afterEach(async () => {
    await t.close();
  });

  it("[LED-FR-005] [LED-FR-006] lista do mais novo, indicadores e contagens por status", async () => {
    // Arrange: 4 leads nos últimos 30 dias (3 via CajuGo, 2 Novo) e 1 de 40 dias
    const a = await liveStore(t.db, "loja-a");
    const v = await car(t.db, a.storeId);
    const base = { storeId: a.storeId, vehicleId: v.id };
    const newest = await lead(t.db, { ...base, createdAt: ago(1) });
    await lead(t.db, { ...base, createdAt: ago(2) });
    await lead(t.db, { ...base, status: "contacting", createdAt: ago(3) });
    await lead(t.db, {
      ...base,
      status: "negotiating",
      origin: "store_catalog",
      createdAt: ago(4),
    });
    await lead(t.db, {
      ...base,
      status: "lost",
      origin: "store_catalog",
      createdAt: ago(40 * 24),
    });

    // Act
    const board = await leadsBoard(t.db, a, "all", NOW);

    // Assert
    expect(board.cards).toHaveLength(5);
    expect(board.cards[0].id).toBe(newest);
    expect(board.newCount).toBe(2);
    expect(board.cajugoShare).toBe(75);
    expect(board.counts).toEqual({
      all: 5,
      new: 2,
      contacting: 1,
      negotiating: 1,
    });
    expect((await leadsBoard(t.db, a, "new", NOW)).cards).toHaveLength(2);
    expect(await newLeadsCount(t.db, a)).toBe(2);
  });

  it("[LED-FR-007] [LED-FR-009] card com sigla, veículo, preço, contato e destaque do Novo com mais de 24 h", async () => {
    // Arrange
    const a = await liveStore(t.db, "loja-a");
    const v = await car(t.db, a.storeId, {
      make: "Fiat",
      model: "ARGO",
      priceCents: 7_000_000,
    });
    await lead(t.db, {
      storeId: a.storeId,
      vehicleId: v.id,
      createdAt: ago(25),
    });

    // Act
    const [card] = (await leadsBoard(t.db, a, "all", NOW)).cards;

    // Assert
    expect(card).toMatchObject({
      initials: "AS",
      name: "Ana Souza",
      status: "new",
      origin: "cajugo",
      channel: "form",
      highlight: true,
      message: "Olá",
      telUrl: "tel:+5579999990000",
      vehicle: {
        id: v.id,
        title: "Fiat ARGO",
        priceCents: 7_000_000,
        deleted: false,
      },
    });
    expect(card.whatsappUrl).toMatch(/^https:\/\/wa\.me\/5579999990000\?text=/);
  });

  it("[LED-FR-014] lead via WhatsApp: sem contato, fora de Novos, mas no total e no % da vitrine", async () => {
    // Arrange
    const a = await liveStore(t.db, "loja-a");
    const v = await car(t.db, a.storeId);
    await lead(t.db, {
      storeId: a.storeId,
      vehicleId: v.id,
      channel: "whatsapp",
      status: "contacting",
      name: null,
      email: null,
      phone: null,
      message: null,
    });

    // Act
    const board = await leadsBoard(t.db, a, "all", NOW);

    // Assert
    expect(board.cards[0]).toMatchObject({
      channel: "whatsapp",
      name: null,
      whatsappUrl: null,
      telUrl: null,
      initials: null,
    });
    expect(board.newCount).toBe(0);
    expect(board.cajugoShare).toBe(100);
    expect(await newLeadsCount(t.db, a)).toBe(0);
  });

  it("[LED-FR-010] lead continua depois que o veículo é vendido ou excluído; o excluído vem marcado", async () => {
    // Arrange
    const a = await liveStore(t.db, "loja-a");
    const sold = await car(t.db, a.storeId);
    const gone = await car(t.db, a.storeId);
    await lead(t.db, {
      storeId: a.storeId,
      vehicleId: sold.id,
      createdAt: ago(1),
    });
    await lead(t.db, {
      storeId: a.storeId,
      vehicleId: gone.id,
      createdAt: ago(2),
    });
    await t.db
      .update(vehicles)
      .set({ status: "sold" })
      .where(eq(vehicles.id, sold.id));
    await t.db
      .update(vehicles)
      .set({ status: "deleted" })
      .where(eq(vehicles.id, gone.id));

    // Act
    const { cards } = await leadsBoard(t.db, a, "all", NOW);

    // Assert
    expect(cards.map((c) => c.vehicle.deleted)).toEqual([false, true]);
  });

  it("[LED-SEC-001] [LED-SEC-003] a loja B não vê nem conta os leads da loja A", async () => {
    // Arrange
    const a = await liveStore(t.db, "loja-a");
    const b = await liveStore(t.db, "loja-b");
    const v = await car(t.db, a.storeId);
    await lead(t.db, { storeId: a.storeId, vehicleId: v.id });

    // Act
    const board = await leadsBoard(t.db, b, "all", NOW);

    // Assert
    expect(board).toEqual({
      cards: [],
      counts: { all: 0, new: 0, contacting: 0, negotiating: 0 },
      newCount: 0,
      cajugoShare: null,
    });
    expect(await newLeadsCount(t.db, b)).toBe(0);
  });

  it("[LED-SEC-003] só quem é da loja lê os leads", async () => {
    // Arrange
    const seller = await personWith(t.db, "seller");

    // Act / Assert
    await expect(leadsBoard(t.db, seller, "all", NOW)).rejects.toMatchObject({
      status: 403,
    });
    await expect(leadsBoard(t.db, null, "all", NOW)).rejects.toMatchObject({
      status: 401,
    });
  });
});
