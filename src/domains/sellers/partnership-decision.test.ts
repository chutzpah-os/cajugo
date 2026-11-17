import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { activityLog, partnerships } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { liveStore } from "@/domains/showcase/testing/fixtures";
import { decidePartnership, requestPartnership, sellerHome } from "./service";
import { acceptSellers, activeSeller } from "./testing/fixtures";

const NOW = new Date("2026-11-17T12:00:00Z");

describe("aprovar, recusar e encerrar parceria [7f]", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    t = await createTestDb();
  });
  afterEach(async () => {
    await t.close();
  });

  async function pendingAna() {
    const a = await liveStore(t.db, "loja-a");
    await acceptSellers(t.db, a.storeId);
    const ana = await activeSeller(t.db, "ANA");
    await requestPartnership(t.db, ana, { storeId: a.storeId });
    const [p] = await t.db.select().from(partnerships);
    return { a, ana, partnershipId: p.id };
  }

  it("[RCL-FR-005] aprovar torna o vendedor parceiro", async () => {
    // Arrange
    const { a, ana, partnershipId } = await pendingAna();

    // Act
    await decidePartnership(
      t.db,
      a,
      { partnershipId, decision: "approve" },
      NOW,
    );

    // Assert
    expect(await sellerHome(t.db, ana, NOW)).toMatchObject({
      stores: [expect.objectContaining({ status: "partner" })],
    });
  });

  it("[RCL-FR-005] recusar fecha o pedido e o vendedor pode pedir de novo", async () => {
    // Arrange
    const { a, ana, partnershipId } = await pendingAna();

    // Act
    await decidePartnership(
      t.db,
      a,
      { partnershipId, decision: "decline" },
      NOW,
    );
    const again = await requestPartnership(t.db, ana, { storeId: a.storeId });

    // Assert
    expect(again).toBe("pending");
    const rows = await t.db.select().from(partnerships);
    expect(rows.map((r) => r.status).sort()).toEqual(["declined", "pending"]);
  });

  it("[RCL-FR-006] encerrar só vale para parceria ativa e registra a data", async () => {
    // Arrange
    const { a, partnershipId } = await pendingAna();

    // Act / Assert
    await expect(
      decidePartnership(t.db, a, { partnershipId, decision: "end" }, NOW),
    ).rejects.toMatchObject({ status: 409 });
    await decidePartnership(
      t.db,
      a,
      { partnershipId, decision: "approve" },
      NOW,
    );
    await decidePartnership(t.db, a, { partnershipId, decision: "end" }, NOW);
    const [row] = await t.db
      .select()
      .from(partnerships)
      .where(eq(partnerships.id, partnershipId));
    expect(row).toMatchObject({ status: "ended", endedAt: NOW });
  });

  it("[RCL-SEC-005] cada decisão fica no registro, sem CPF nem Pix", async () => {
    // Arrange
    const { a, partnershipId } = await pendingAna();

    // Act
    await decidePartnership(
      t.db,
      a,
      { partnershipId, decision: "approve" },
      NOW,
    );
    await decidePartnership(t.db, a, { partnershipId, decision: "end" }, NOW);

    // Assert
    const log = await t.db.select().from(activityLog);
    expect(log.map((l) => l.action)).toEqual(
      expect.arrayContaining(["partnership.approved", "partnership.ended"]),
    );
    expect(JSON.stringify(log)).not.toContain("@x.com");
  });

  it("[RCL-SEC-001] a loja B não decide pedido da loja A (404) e nada muda", async () => {
    // Arrange
    const { partnershipId } = await pendingAna();
    const b = await liveStore(t.db, "loja-b");

    // Act / Assert
    await expect(
      decidePartnership(t.db, b, { partnershipId, decision: "approve" }, NOW),
    ).rejects.toMatchObject({ status: 404 });
    const [row] = await t.db.select().from(partnerships);
    expect(row.status).toBe("pending");
  });
});
