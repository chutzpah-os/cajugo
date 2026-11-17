import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { leads, partnerships, stores } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { uuidv7 } from "@/platform/db/uuid";
import { contactStore } from "@/domains/leads/service";
import { parseFilters } from "@/domains/showcase/service";
import { car, liveStore } from "@/domains/showcase/testing/fixtures";
import { requestPartnership, sellerShowcase } from "./service";
import { acceptSellers, activeSeller } from "./testing/fixtures";

describe("parceria que vale", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  const NONE = parseFilters({});

  beforeEach(async () => {
    vi.stubEnv("HASH_SECRET", "segredo-de-teste");
    t = await createTestDb();
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await t.close();
  });

  const setAccepts = (storeId: string, on: boolean) =>
    t.db
      .update(stores)
      .set({ acceptsSellers: on })
      .where(eq(stores.id, storeId));

  it("[RCL-FR-001] loja que não aceita: Pedir parceria recusado e o card fica 'closed'", async () => {
    // Arrange
    const a = await liveStore(t.db, "loja-a");
    const v = await car(t.db, a.storeId);
    const ana = await activeSeller(t.db, "ANA");

    // Act
    const view = await sellerShowcase(t.db, ana, { filters: NONE });

    // Assert
    expect(view.items.find((i) => i.card.vehicleId === v.id)?.partner).toBe(
      "closed",
    );
    await expect(
      requestPartnership(t.db, ana, { storeId: a.storeId }),
    ).rejects.toMatchObject({ status: 409 });
    await acceptSellers(t.db, a.storeId);
    expect(await requestPartnership(t.db, ana, { storeId: a.storeId })).toBe(
      "pending",
    );
  });

  it("[RCL-FR-001] desligar suspende a parceria (sem 'Você ganha', lead sem vendedor); religar devolve", async () => {
    // Arrange
    const a = await liveStore(t.db, "loja-a");
    await acceptSellers(t.db, a.storeId, { type: "pct", value: 200 });
    const v = await car(t.db, a.storeId, { priceCents: 6_000_000 });
    const ana = await activeSeller(t.db, "ANA");
    await t.db.insert(partnerships).values({
      sellerId: ana.userId,
      storeId: a.storeId,
      origin: "request",
      status: "active",
    });
    const lead = () =>
      contactStore(
        t.db,
        {
          requestId: uuidv7(),
          vehicleId: v.id,
          origin: "cajugo",
          name: "Iris",
          email: "i@i.com",
          phone: "(79) 99999-0000",
          website: "",
        },
        { ipHash: uuidv7(), refCode: "ANA" },
      );
    const card = async () =>
      (await sellerShowcase(t.db, ana, { filters: NONE })).items.find(
        (i) => i.card.vehicleId === v.id,
      );

    // Act
    await setAccepts(a.storeId, false);
    const off = await card();
    await lead();
    await setAccepts(a.storeId, true);
    const on = await card();
    await lead();

    // Assert
    expect(off).toMatchObject({ partner: "closed", earnCents: null });
    expect(on).toMatchObject({ partner: "partner", earnCents: 120_000 });
    const rows = await t.db.select().from(leads).orderBy(leads.createdAt);
    expect(rows.map((r) => r.sellerId)).toEqual([null, ana.userId]);
  });
});
