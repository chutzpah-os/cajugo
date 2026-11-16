import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { leads } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { car, liveStore } from "@/domains/showcase/testing/fixtures";
import { recordWhatsappClick } from "./service";

const NOW = new Date("2026-11-16T10:00:00Z");
const ctx = { ipHash: "ip-1", now: NOW };

describe("lead pelo WhatsApp", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    t = await createTestDb();
  });
  afterEach(async () => {
    await t.close();
  });

  it("[LED-FR-003] [LED-FR-014] cria um lead via WhatsApp, Em contato, sem nome nem contato", async () => {
    // Arrange
    const { storeId } = await liveStore(t.db, "loja-a");
    const v = await car(t.db, storeId);

    // Act
    await recordWhatsappClick(t.db, { vehicleId: v.id, origin: "cajugo" }, ctx);

    // Assert
    expect(await t.db.select().from(leads)).toEqual([
      expect.objectContaining({
        storeId,
        vehicleId: v.id,
        channel: "whatsapp",
        origin: "cajugo",
        status: "contacting",
        name: null,
        email: null,
        phone: null,
        message: null,
      }),
    ]);
  });

  it("[LED-FR-003] entrada inválida ou veículo fora do ar não grava e não lança", async () => {
    // Arrange
    const { storeId } = await liveStore(t.db, "loja-a");
    const sold = await car(t.db, storeId, { status: "sold" });

    // Act / Assert
    await expect(
      recordWhatsappClick(t.db, { vehicleId: sold.id, origin: "cajugo" }, ctx),
    ).resolves.toBeUndefined();
    await expect(
      recordWhatsappClick(t.db, { vehicleId: "x", storeId }, ctx),
    ).resolves.toBeUndefined();
    expect(await t.db.select().from(leads)).toEqual([]);
  });

  it("[LED-SEC-002] o 6º toque do IP no minuto não grava; a mensagem à loja tem limite próprio", async () => {
    // Arrange
    const { storeId } = await liveStore(t.db, "loja-a");
    const v = await car(t.db, storeId);

    // Act
    for (let i = 0; i < 6; i++)
      await recordWhatsappClick(
        t.db,
        { vehicleId: v.id, origin: "cajugo" },
        ctx,
      );

    // Assert
    expect(await t.db.select().from(leads)).toHaveLength(5);
  });
});
