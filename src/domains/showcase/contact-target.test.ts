import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { stores } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { contactTarget } from "./service";
import { car, liveStore } from "./testing/fixtures";

describe("contactTarget", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    t = await createTestDb();
  });
  afterEach(async () => {
    await t.close();
  });

  it("[LED-FR-001] [LED-FR-004] loja e divulgação de um veículo que o público vê", async () => {
    // Arrange
    const { storeId } = await liveStore(t.db, "loja-a");
    const shared = await car(t.db, storeId);
    const catalogOnly = await car(t.db, storeId, { shareOnCajugo: false });

    // Act / Assert
    expect(await contactTarget(t.db, shared.id)).toEqual({
      storeId,
      shared: true,
    });
    expect(await contactTarget(t.db, catalogOnly.id)).toEqual({
      storeId,
      shared: false,
    });
  });

  it("[LED-FR-001] veículo fora do ar ou de loja suspensa não recebe contato", async () => {
    // Arrange
    const a = (await liveStore(t.db, "loja-a")).storeId;
    const b = (await liveStore(t.db, "loja-b")).storeId;
    const sold = await car(t.db, a, { status: "sold" });
    const draft = await car(t.db, a, { status: "draft" });
    const suspended = await car(t.db, b);
    await t.db
      .update(stores)
      .set({ status: "suspended" })
      .where(eq(stores.id, b));

    // Act / Assert
    for (const id of [
      sold.id,
      draft.id,
      suspended.id,
      "00000000-0000-4000-8000-000000000000",
    ])
      expect(await contactTarget(t.db, id)).toBeNull();
  });
});
