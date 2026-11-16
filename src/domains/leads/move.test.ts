import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { leads } from "@/platform/db/schema";
import type { Db } from "@/platform/db/types";
import { createTestDb } from "@/platform/db/testing/test-db";
import { personWith } from "@/domains/billing/testing/fixtures";
import { car, liveStore } from "@/domains/showcase/testing/fixtures";
import { moveLead } from "./service";

const NOW = new Date("2026-11-16T12:00:00Z");

async function newLead(
  db: Db,
  storeId: string,
  status: (typeof leads.$inferInsert)["status"] = "new",
) {
  const v = await car(db, storeId);
  const [row] = await db
    .insert(leads)
    .values({
      storeId,
      vehicleId: v.id,
      channel: "form",
      origin: "cajugo",
      status,
      name: "Ana",
    })
    .returning({ id: leads.id });
  return row.id;
}

const statusOf = async (db: Db, id: string) =>
  (await db.select().from(leads).where(eq(leads.id, id)))[0];

describe("mudar status do lead", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    t = await createTestDb();
  });
  afterEach(async () => {
    await t.close();
  });

  it("[LED-FR-008] avança um passo e marca Perdido; o usuário da loja também pode", async () => {
    // Arrange
    const a = await liveStore(t.db, "loja-a");
    const staff = await personWith(t.db, "store_staff", a.storeId);
    const id = await newLead(t.db, a.storeId);

    // Act
    const first = await moveLead(t.db, a, { leadId: id, to: "next" }, NOW);
    const second = await moveLead(t.db, staff, { leadId: id, to: "lost" }, NOW);

    // Assert
    expect([first, second]).toEqual(["contacting", "lost"]);
    expect(await statusOf(t.db, id)).toMatchObject({
      status: "lost",
      updatedAt: NOW,
    });
  });

  it("[LED-FR-008] lead Vendido ou Perdido não muda mais", async () => {
    // Arrange
    const a = await liveStore(t.db, "loja-a");
    const sold = await newLead(t.db, a.storeId, "sold");
    const lost = await newLead(t.db, a.storeId, "lost");

    // Act / Assert
    for (const [leadId, to] of [
      [sold, "next"],
      [sold, "lost"],
      [lost, "next"],
    ] as const)
      await expect(
        moveLead(t.db, a, { leadId, to }, NOW),
      ).rejects.toMatchObject({ status: 409 });
    expect((await statusOf(t.db, sold)).status).toBe("sold");
  });

  it("[LED-SEC-001] lead da loja A pela loja B responde como inexistente", async () => {
    // Arrange
    const a = await liveStore(t.db, "loja-a");
    const b = await liveStore(t.db, "loja-b");
    const id = await newLead(t.db, a.storeId);

    // Act / Assert
    await expect(
      moveLead(t.db, b, { leadId: id, to: "next" }, NOW),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      moveLead(t.db, b, { leadId: "nao-e-uuid", to: "next" }, NOW),
    ).rejects.toMatchObject({ status: 404 });
    expect((await statusOf(t.db, id)).status).toBe("new");
  });

  it("[LED-SEC-005] admin e suporte só leem: mudar status é recusado", async () => {
    // Arrange
    const a = await liveStore(t.db, "loja-a");
    const id = await newLead(t.db, a.storeId);
    const support = await personWith(t.db, "support");
    const admin = await personWith(t.db, "admin");

    // Act / Assert
    for (const who of [support, admin])
      await expect(
        moveLead(t.db, who, { leadId: id, to: "next" }, NOW),
      ).rejects.toMatchObject({ status: 403 });
    expect((await statusOf(t.db, id)).status).toBe("new");
  });
});
