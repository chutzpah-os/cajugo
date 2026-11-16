import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { leads, partnerships } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { uuidv7 } from "@/platform/db/uuid";
import { car, liveStore } from "@/domains/showcase/testing/fixtures";
import { activeSeller } from "@/domains/sellers/testing/fixtures";
import { contactStore, leadsBoard, recordWhatsappClick } from "./service";

const NOW = new Date("2026-11-16T10:00:00Z");
const form = (vehicleId: string) => ({
  requestId: uuidv7(),
  vehicleId,
  origin: "cajugo",
  name: "Ana",
  email: "ana@exemplo.com",
  phone: "(79) 99999-0000",
  message: "Olá",
  website: "",
});

describe("lead pelo link do vendedor", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    t = await createTestDb();
  });
  afterEach(async () => {
    await t.close();
  });

  async function setup() {
    const a = await liveStore(t.db, "loja-a");
    const v = await car(t.db, a.storeId);
    const bia = await activeSeller(t.db, "BIA", { name: "Bia Lima" });
    await t.db.insert(partnerships).values({
      sellerId: bia.userId,
      storeId: a.storeId,
      origin: "request",
      status: "active",
    });
    return { a, v, bia };
  }

  it("[SEL-FR-011] formulário e WhatsApp pelo link de vendedor parceiro ficam com ele, origem vendedor", async () => {
    // Arrange
    const { a, v, bia } = await setup();
    const ctx = { ipHash: "ip-1", now: NOW, refCode: "bia" };

    // Act
    await contactStore(t.db, form(v.id), ctx);
    await recordWhatsappClick(
      t.db,
      { requestId: uuidv7(), vehicleId: v.id, origin: "cajugo" },
      ctx,
    );

    // Assert
    const rows = await t.db.select().from(leads);
    expect(rows).toHaveLength(2);
    expect(
      rows.every((r) => r.sellerId === bia.userId && r.origin === "seller"),
    ).toBe(true);
    const board = await leadsBoard(t.db, a, "all", NOW);
    expect(board.cards[0].sellerName).toBe("Bia Lima");
  });

  it("[SEL-FR-011] [SEL-SEC-006] sem parceria, vendedor bloqueado ou código falso: lead sem vendedor", async () => {
    // Arrange
    const { v, bia } = await setup();
    const b = await liveStore(t.db, "loja-b");
    const onix = await car(t.db, b.storeId);
    await activeSeller(t.db, "BLOQ", { status: "blocked", blockedReason: "x" });

    // Act
    await contactStore(t.db, form(onix.id), {
      ipHash: "ip-1",
      now: NOW,
      refCode: "BIA",
    });
    await contactStore(t.db, form(v.id), {
      ipHash: "ip-2",
      now: NOW,
      refCode: "BLOQ",
    });
    await contactStore(t.db, form(v.id), {
      ipHash: "ip-3",
      now: NOW,
      refCode: "NINGUEM",
    });
    await contactStore(t.db, form(v.id), { ipHash: "ip-4", now: NOW });

    // Assert
    const rows = await t.db.select().from(leads);
    expect(rows).toHaveLength(4);
    expect(
      rows.every((r) => r.sellerId === null && r.origin === "cajugo"),
    ).toBe(true);
    expect(bia.userId).toBeTruthy();
  });

  it("[SEL-FR-005] vendedor bloqueado depois de compartilhar deixa de marcar novos leads", async () => {
    // Arrange
    const { v, bia } = await setup();
    const { sellers } = await import("@/platform/db/schema");
    const { eq } = await import("drizzle-orm");
    await t.db
      .update(sellers)
      .set({ status: "blocked", blockedReason: "Cobrou sinal por fora" })
      .where(eq(sellers.profileId, bia.userId));

    // Act
    await contactStore(t.db, form(v.id), {
      ipHash: "ip-1",
      now: NOW,
      refCode: "BIA",
    });

    // Assert
    const [row] = await t.db.select().from(leads);
    expect(row.sellerId).toBeNull();
  });
});
