import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import {
  activityLog,
  invoices,
  payments,
  stores,
  vehicles,
} from "@/platform/db/schema";
import { FakeCloudinary } from "@/platform/cloudinary/fake-cloudinary";
import { createTestDb } from "@/platform/db/testing/test-db";
import { car } from "@/domains/showcase/testing/fixtures";
import {
  cancelSubscription,
  confirmPayment,
  receiptUpload,
  resubscribe,
  runBillingCycle,
  startCheckout,
  submitReceipt,
} from "./service";
import {
  configurePix,
  payingStore,
  personWith,
  storeRow,
} from "./testing/fixtures";

const DUE = new Date("2026-12-10T03:00:00Z");
const at = (month: number, day: number) =>
  new Date(Date.UTC(2026, month - 1, day, 12));

describe("reassinar a loja cancelada", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  let cloudinary: FakeCloudinary;
  const deps = (now: Date) => ({ db: t.db, cloudinary, now: () => now });

  beforeEach(async () => {
    t = await createTestDb();
    cloudinary = new FakeCloudinary();
    await configurePix(t.db);
  });
  afterEach(() => t.close());

  /** Loja A cancelada em 10/12 no fim do período, com um veículo publicado. */
  async function canceledStore() {
    const a = await payingStore(t.db, "loja-a", {
      billingDay: 10,
      nextDueAt: DUE,
    });
    await t.db
      .update(stores)
      .set({ taxId: "52998224725", taxIdType: "cpf" })
      .where(eq(stores.id, a.storeId));
    const v = await car(t.db, a.storeId);
    await cancelSubscription(deps(at(12, 1)), a, {});
    await runBillingCycle(t.db, at(12, 10));
    return { a, vehicleId: v.id };
  }

  it("[CAN-FR-006] cancelada há 20 dias reassina: nova 1ª mensalidade, confirmada → ativa com novo dia, mesmo endereço e os veículos de antes", async () => {
    // Arrange
    const { a, vehicleId } = await canceledStore();
    const now = at(12, 30);

    // Act
    await resubscribe(deps(now), a);
    const registered = await storeRow(t.db, a.storeId);
    await startCheckout(deps(now), a, {});
    const signed = await receiptUpload(deps(now), a);
    cloudinary.simulateUpload(signed, { format: "png", bytes: 1000 });
    await submitReceipt(deps(now), a, {
      publicId: `${signed.fields.folder}/${signed.fields.public_id}`,
      paidCents: 10000,
    });
    const [payment] = await t.db.select().from(payments);
    await confirmPayment(deps(now), await personWith(t.db, "admin"), {
      paymentId: payment.id,
    });

    // Assert
    expect(registered).toMatchObject({
      status: "registered",
      canceledAt: null,
      activeUntil: null,
      cancelRequestedAt: null,
      billingDay: null,
      nextDueAt: null,
    });
    const store = await storeRow(t.db, a.storeId);
    expect(store).toMatchObject({
      status: "active",
      slug: "loja-a",
      billingDay: 30,
    });
    const firsts = await t.db
      .select({ status: invoices.status })
      .from(invoices)
      .where(eq(invoices.kind, "first"));
    expect(firsts).toEqual([{ status: "paid" }]);
    const [v] = await t.db
      .select({ status: vehicles.status })
      .from(vehicles)
      .where(eq(vehicles.id, vehicleId));
    expect(v.status).toBe("published");
    const [log] = await t.db
      .select({ userId: activityLog.userId, data: activityLog.data })
      .from(activityLog)
      .where(eq(activityLog.action, "subscription.resubscribed"));
    expect(log).toEqual({ userId: a.userId, data: null });
  });

  it("[CAN-FR-006] só a loja cancelada reassina: ativa, agendada ou arquivada → 409", async () => {
    const { a } = await canceledStore();
    const b = await payingStore(t.db, "loja-b", {
      billingDay: 10,
      nextDueAt: DUE,
    });
    await t.db
      .update(stores)
      .set({ status: "archived" })
      .where(eq(stores.id, a.storeId));

    for (const s of [a, b])
      await expect(resubscribe(deps(at(12, 30)), s)).rejects.toMatchObject({
        status: 409,
      });
    expect((await storeRow(t.db, a.storeId)).status).toBe("archived");
  });

  it("[CAN-SEC-002] usuário da loja, suporte e admin não reassinam (403)", async () => {
    const { a } = await canceledStore();

    for (const role of ["store_staff", "support", "admin"] as const)
      await expect(
        resubscribe(
          deps(at(12, 30)),
          await personWith(
            t.db,
            role,
            role === "store_staff" ? a.storeId : null,
          ),
        ),
      ).rejects.toMatchObject({ status: 403 });
    expect((await storeRow(t.db, a.storeId)).status).toBe("canceled");
  });
});
