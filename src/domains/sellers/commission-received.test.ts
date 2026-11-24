import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { activityLog, notices, profiles, sales } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { uuidv7 } from "@/platform/db/uuid";
import { personWith } from "@/domains/billing/testing/fixtures";
import { car, liveStore } from "@/domains/showcase/testing/fixtures";
import { setCommissionReceived } from "./service";
import { activeSeller, soldBy } from "./testing/fixtures";

const NOW = new Date("2026-11-23T12:00:00Z");
const HOUR = 3_600_000;
const later = (h: number) => new Date(NOW.getTime() + h * HOUR);

describe("Recebi da comissão [7d]", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  const deps = () => ({ db: t.db });

  beforeEach(async () => {
    t = await createTestDb();
  });
  afterEach(() => t.close());

  async function sale(status: "to_receive" | "paid" = "to_receive") {
    const ana = await activeSeller(t.db, "ANA", { name: "Ana Souza" });
    const a = await liveStore(t.db, "loja-a");
    const staff = await personWith(t.db, "store_staff", a.storeId);
    await t.db
      .update(profiles)
      .set({ storeId: a.storeId })
      .where(eq(profiles.id, a.userId));
    const argo = await car(t.db, a.storeId, { make: "Fiat", model: "ARGO" });
    const row = await soldBy(t.db, {
      sellerId: ana.userId,
      storeId: a.storeId,
      confirmedBy: a.userId,
      vehicleId: argo.id,
      status,
    });
    return { ana, a, staff, row };
  }

  const saleRow = async (id: string) =>
    (await t.db.select().from(sales).where(eq(sales.id, id)))[0];

  it("[EXT-FR-003] Recebi: a comissão fica Paga, com a data do Recebi", async () => {
    // Arrange
    const { ana, row } = await sale();

    // Act
    await setCommissionReceived(
      deps(),
      ana,
      { saleId: row.id, received: true },
      NOW,
    );

    // Assert
    expect(await saleRow(row.id)).toMatchObject({
      commissionStatus: "paid",
      commissionReceivedAt: NOW,
    });
  });

  it("[EXT-FR-004] repetir o Recebi, ou em comissão já paga pela loja, não muda nada", async () => {
    const { ana, row } = await sale("paid");

    await setCommissionReceived(
      deps(),
      ana,
      { saleId: row.id, received: true },
      NOW,
    );

    expect(await saleRow(row.id)).toMatchObject({
      commissionStatus: "paid",
      commissionReceivedAt: null,
    });
    expect(await t.db.select().from(notices)).toHaveLength(0);
  });

  it("[EXT-FR-010] [EXT-SEC-004] a loja (dono e usuário) vê o aviso; o Recebi fica no registro", async () => {
    const { ana, a, staff, row } = await sale();

    await setCommissionReceived(
      deps(),
      ana,
      { saleId: row.id, received: true },
      NOW,
    );

    const sent = await t.db.select().from(notices);
    expect(sent.map((n) => n.profileId).sort()).toEqual(
      [a.userId, staff.userId].sort(),
    );
    expect(sent[0]).toMatchObject({
      kind: "commission_received",
      data: { seller: "Ana", vehicle: "Fiat ARGO" },
    });
    const [log] = await t.db
      .select()
      .from(activityLog)
      .where(eq(activityLog.action, "commission.received"));
    expect(log).toMatchObject({ userId: ana.userId, entityId: row.id });
  });

  it("[EXT-SEC-001] a vendedora B não marca o Recebi da venda de A; inexistente também é 404", async () => {
    const { row } = await sale();
    const bia = await activeSeller(t.db, "BIA");

    for (const saleId of [row.id, uuidv7()])
      await expect(
        setCommissionReceived(deps(), bia, { saleId, received: true }, NOW),
      ).rejects.toMatchObject({ status: 404 });
    expect((await saleRow(row.id)).commissionStatus).toBe("to_receive");
  });

  it("[EXT-SEC-002] lojista, usuário da loja, suporte e admin não marcam o Recebi", async () => {
    const { a, staff, row } = await sale();
    const others = [
      a,
      staff,
      await personWith(t.db, "support"),
      await personWith(t.db, "admin"),
    ];

    for (const someone of others)
      await expect(
        setCommissionReceived(
          deps(),
          someone,
          { saleId: row.id, received: true },
          NOW,
        ),
      ).rejects.toMatchObject({ status: 403 });
    expect((await saleRow(row.id)).commissionStatus).toBe("to_receive");
  });

  it("[EXT-SEC-002] o vendedor bloqueado também marca o Recebi (D2); campos a mais são recusados", async () => {
    const { ana, row } = await sale();
    const { sellers } = await import("@/platform/db/schema");
    await t.db
      .update(sellers)
      .set({ status: "blocked", blockedReason: "teste" })
      .where(eq(sellers.profileId, ana.userId));

    await expect(
      setCommissionReceived(
        deps(),
        ana,
        { saleId: row.id, received: true, status: "paid" },
        NOW,
      ),
    ).rejects.toMatchObject({ status: 422 });
    await setCommissionReceived(
      deps(),
      ana,
      { saleId: row.id, received: true },
      later(1),
    );

    expect((await saleRow(row.id)).commissionStatus).toBe("paid");
  });
});
