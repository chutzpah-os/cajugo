import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { activityLog, stores } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { FakeAuthProvider } from "@/platform/supabase/fake-auth-provider";
import { changeSlug } from "@/domains/stores/service";
import { runBillingCycle } from "./service";
import { storeOwner, storeRow } from "./testing/fixtures";

const DAY8 = new Date("2026-12-09T12:00:00Z");

describe("ciclo de cobrança: endereço de quem não pagou", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    t = await createTestDb();
  });
  afterEach(() => t.close());

  /** Loja cadastrada em 01/12 com o endereço reservado até 08/12. */
  async function unpaid(slug: string, reservedUntil: Date) {
    const n = await storeOwner(t.db, slug, `${slug}@x.com`);
    await t.db
      .update(stores)
      .set({ slugReservedUntil: reservedUntil })
      .where(eq(stores.id, n.storeId));
    return n;
  }

  it("[CAN-FR-008] cadastrada sem pagamento em 7 dias: endereço provisório e o antigo livre para outra loja", async () => {
    // Arrange
    const n = await unpaid("loja-nova", new Date("2026-12-08T12:00:00Z"));
    const fresh = await unpaid(
      "loja-recente",
      new Date("2026-12-12T12:00:00Z"),
    );

    // Act
    const result = await runBillingCycle(t.db, DAY8);

    // Assert
    expect(result.slugsReleased).toBe(1);
    const store = await storeRow(t.db, n.storeId);
    expect(store.slug).toMatch(/^provisorio-[0-9a-f]{8}$/);
    expect(store).toMatchObject({
      status: "registered",
      slugReservedUntil: null,
      slugChangedAt: null,
    });
    expect((await storeRow(t.db, fresh.storeId)).slug).toBe("loja-recente");
    await expect(
      storeOwner(t.db, "loja-nova", "outra@x.com"),
    ).resolves.toBeDefined();
  });

  it("[CAN-FR-008] pagou depois: a 1ª troca em Minha loja não conta no limite de 30 dias; a seguinte conta", async () => {
    // Arrange
    const n = await unpaid("loja-nova", new Date("2026-12-08T12:00:00Z"));
    await runBillingCycle(t.db, DAY8);
    await t.db
      .update(stores)
      .set({ status: "active" })
      .where(eq(stores.id, n.storeId));
    const deps = { db: t.db, auth: new FakeAuthProvider(), now: () => DAY8 };

    // Act
    const first = await changeSlug(deps, n, "loja-nova-2");
    const second = changeSlug(deps, n, "loja-nova-3");

    // Assert
    expect(first).toEqual({ slug: "loja-nova-2" });
    await expect(second).rejects.toMatchObject({ status: 422 });
  });

  it("[CAN-SEC-004] [CAN-NFR-002] registra a liberação e rodar 2× não repete", async () => {
    const n = await unpaid("loja-nova", new Date("2026-12-08T12:00:00Z"));

    await runBillingCycle(t.db, DAY8);
    const again = await runBillingCycle(t.db, DAY8);

    expect(again.slugsReleased).toBe(0);
    const log = await t.db
      .select({ userId: activityLog.userId, entityId: activityLog.entityId })
      .from(activityLog)
      .where(eq(activityLog.action, "store.slug_released"));
    expect(log).toEqual([{ userId: null, entityId: n.storeId }]);
  });
});
