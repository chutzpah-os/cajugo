import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { stores } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { favoriteCards } from "./service";
import { car, liveStore } from "./testing/fixtures";

describe("cards atuais dos favoritos", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    vi.stubEnv("HASH_SECRET", "segredo-de-teste");
    t = await createTestDb();
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await t.close();
  });

  it("[BUY-FR-007] [BUY-SEC-002] só o que a página pública mostra agora, divulgado ou não", async () => {
    // Arrange
    const a = (await liveStore(t.db, "loja-a")).storeId;
    const b = (await liveStore(t.db, "loja-b")).storeId;
    const shared = await car(t.db, a, { priceCents: 7_000_000 });
    const notShared = await car(t.db, a, { shareOnCajugo: false });
    const sold = await car(t.db, a, { status: "sold" });
    const draft = await car(t.db, a, { status: "draft" });
    const suspended = await car(t.db, b);
    await t.db
      .update(stores)
      .set({ status: "suspended" })
      .where(eq(stores.id, b));

    // Act
    const cards = await favoriteCards(t.db, [
      shared.id,
      notShared.id,
      sold.id,
      draft.id,
      suspended.id,
      "00000000-0000-4000-8000-000000000000",
    ]);

    // Assert
    expect(cards.map((c) => c.vehicleId).sort()).toEqual(
      [shared.id, notShared.id].sort(),
    );
    expect(cards.find((c) => c.vehicleId === shared.id)).toMatchObject({
      priceCents: 7_000_000,
      path: expect.stringMatching(/^\/v\//),
    });
    const json = JSON.stringify(cards);
    expect(json).not.toContain("ABC1D23");
    expect(json).not.toContain("9BWZZZ377VT004251");
  });

  it("[BUY-FR-007] lista vazia não consulta nada", async () => {
    expect(await favoriteCards(t.db, [])).toEqual([]);
  });
});
