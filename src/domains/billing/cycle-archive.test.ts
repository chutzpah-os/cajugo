import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import {
  activityLog,
  invoices,
  leads,
  notices,
  payments,
  profiles,
  stores,
  vehiclePhotos,
  vehicles,
} from "@/platform/db/schema";
import { FakeCloudinary } from "@/platform/cloudinary/fake-cloudinary";
import { createTestDb } from "@/platform/db/testing/test-db";
import { FakeAuthProvider } from "@/platform/supabase/fake-auth-provider";
import { car } from "@/domains/showcase/testing/fixtures";
import { activeSeller, soldBy } from "@/domains/sellers/testing/fixtures";
import { grantRole } from "@/domains/auth/roles";
import { cancelSubscription, runBillingCycle } from "./service";
import { payingStore, storeRow } from "./testing/fixtures";

const DUE = new Date("2026-12-10T03:00:00Z");
const CANCELED = new Date(Date.UTC(2026, 11, 10, 12));
const afterDays = (days: number) =>
  new Date(CANCELED.getTime() + days * 86_400_000);

describe("ciclo de cobrança: arquivamento da loja cancelada", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  let cloudinary: FakeCloudinary;
  let auth: FakeAuthProvider;
  const ext = () => ({ auth, cloudinary });

  beforeEach(async () => {
    t = await createTestDb();
    cloudinary = new FakeCloudinary();
    auth = new FakeAuthProvider();
  });
  afterEach(() => t.close());

  /** Loja A cancelada em 10/12, com dados, veículos (um vendido), lead e comprovante. */
  async function canceledStore() {
    const a = await payingStore(t.db, "loja-a", {
      billingDay: 10,
      nextDueAt: DUE,
    });
    await t.db
      .update(stores)
      .set({
        taxId: "52998224725",
        taxIdType: "cpf",
        addressStreet: "Rua A",
        addressNumber: "10",
        addressZip: "49000000",
        about: "Loja de carros",
        instagram: "lojaa",
        logoPublicId: "staging/stores/a/logo",
        coverPublicId: "staging/stores/a/cover",
      })
      .where(eq(stores.id, a.storeId));
    const forSale = await car(t.db, a.storeId);
    const sold = await car(t.db, a.storeId, { status: "sold" });
    const ana = await activeSeller(t.db, "ana");
    await soldBy(t.db, {
      sellerId: ana.userId,
      storeId: a.storeId,
      confirmedBy: a.userId,
      vehicleId: sold.id,
    });
    await t.db.insert(leads).values({
      storeId: a.storeId,
      vehicleId: forSale.id,
      channel: "form",
      origin: "store_catalog",
      status: "new",
      name: "Comprador",
      email: "comprador@x.com",
      phone: "5579999991111",
    });
    const [invoice] = await t.db
      .insert(invoices)
      .values({
        storeId: a.storeId,
        kind: "first",
        membershipCents: 10000,
        totalCents: 10000,
        dueAt: new Date("2026-01-01"),
        status: "paid",
      })
      .returning();
    await t.db.insert(payments).values({
      invoiceId: invoice.id,
      storeId: a.storeId,
      amountCents: 10000,
      receiptPublicId: "staging/receipts/a/1",
      receiptFormat: "png",
      status: "confirmed",
      submittedBy: a.userId,
      submittedAt: new Date("2026-01-01"),
    });
    await cancelSubscription(
      { db: t.db, now: () => new Date("2026-12-01") },
      a,
      {
        reason: "Vou parar de vender",
      },
    );
    await runBillingCycle(t.db, CANCELED);
    return { a, forSale, sold };
  }

  it("[CAN-FR-007] [CAN-SEC-003] 90 dias depois: apaga dados da loja, veículos, fotos, leads e a conta do dono; mantém o nome, as faturas e os pagamentos", async () => {
    // Arrange
    const { a, forSale, sold } = await canceledStore();
    const deleteUser = vi.spyOn(auth, "adminDeleteUser");

    // Act
    const early = await runBillingCycle(t.db, afterDays(89), {}, ext());
    const result = await runBillingCycle(t.db, afterDays(90), {}, ext());

    // Assert
    expect(early.archived).toBe(0);
    expect(result.archived).toBe(1);
    const store = await storeRow(t.db, a.storeId);
    expect(store).toMatchObject({
      status: "archived",
      name: "Loja loja-a",
      whatsapp: "",
      taxId: null,
      taxIdType: null,
      addressStreet: null,
      addressNumber: null,
      addressZip: null,
      about: null,
      instagram: null,
      logoPublicId: null,
      coverPublicId: null,
      cancelReason: null,
    });
    expect(store.slug).toMatch(/^arquivada-[0-9a-f]{8}$/);
    const left = await t.db.select({ id: vehicles.id }).from(vehicles);
    expect(left).toEqual([{ id: sold.id }]);
    expect(await t.db.select().from(vehiclePhotos)).toHaveLength(0);
    expect(cloudinary.destroyed).toEqual(
      expect.arrayContaining([
        `staging/vehicles/${forSale.id}/photo-0`,
        `staging/vehicles/${sold.id}/photo-0`,
        "staging/stores/a/logo",
        "staging/stores/a/cover",
        "staging/receipts/a/1",
      ]),
    );
    expect(await t.db.select().from(leads)).toHaveLength(0);
    const [owner] = await t.db
      .select()
      .from(profiles)
      .where(eq(profiles.id, a.userId));
    expect(owner).toMatchObject({
      name: "Conta apagada",
      phone: null,
      cpf: null,
      pixKey: null,
      roles: [],
      storeId: null,
    });
    expect(owner.email).not.toContain("loja-a");
    expect(deleteUser).toHaveBeenCalledWith(a.userId);
    expect(
      await t.db.select().from(notices).where(eq(notices.profileId, a.userId)),
    ).toHaveLength(0);
    expect(await t.db.select().from(invoices)).toHaveLength(1);
    const [payment] = await t.db.select().from(payments);
    expect(payment).toMatchObject({
      amountCents: 10000,
      receiptPublicId: null,
      receiptFormat: null,
    });
  });

  it("[CAN-FR-007] o dono que também é vendedor só perde o papel de lojista", async () => {
    // Arrange
    const { a } = await canceledStore();
    await grantRole(t.db, a.userId, "seller", "admin");
    const deleteUser = vi.spyOn(auth, "adminDeleteUser");

    // Act
    await runBillingCycle(t.db, afterDays(90), {}, ext());

    // Assert
    const [owner] = await t.db
      .select()
      .from(profiles)
      .where(eq(profiles.id, a.userId));
    expect(owner).toMatchObject({
      name: "Dono",
      roles: ["seller"],
      storeId: null,
    });
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("[CAN-FR-007] [CAN-SEC-004] [CAN-NFR-002] libera o endereço, registra sem dado pessoal e rodar 2× não repete", async () => {
    // Arrange
    await canceledStore();

    // Act
    await runBillingCycle(t.db, afterDays(90), {}, ext());
    const again = await runBillingCycle(t.db, afterDays(91), {}, ext());
    const reuse = t.db.insert(stores).values({
      name: "Outra",
      slug: "loja-a",
      city: "Aracaju",
      state: "SE",
      whatsapp: "5579981360206",
      ownerId: (
        await payingStore(t.db, "loja-b", {
          billingDay: 1,
          nextDueAt: DUE,
        })
      ).userId,
    });

    // Assert
    expect(again.archived).toBe(0);
    await expect(reuse).resolves.toBeDefined();
    const log = await t.db
      .select({ userId: activityLog.userId, data: activityLog.data })
      .from(activityLog)
      .where(eq(activityLog.action, "store.archived"));
    expect(log).toEqual([
      {
        userId: null,
        data: {
          vehiclesDeleted: 1,
          vehiclesKept: 1,
          leads: 1,
          files: 5,
          accountsDeleted: 1,
          rolesRemoved: 0,
        },
      },
    ]);
    expect(JSON.stringify(log)).not.toMatch(/comprador|Rua A|5299/);
  });

  it("[CAN-FR-007] sem os clientes de login e de arquivos, o ciclo não arquiva", async () => {
    const { a } = await canceledStore();

    const result = await runBillingCycle(t.db, afterDays(90));

    expect(result.archived).toBe(0);
    expect((await storeRow(t.db, a.storeId)).status).toBe("canceled");
  });
});
