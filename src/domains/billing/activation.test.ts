import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stores } from "@/platform/db/schema";
import { FakeCloudinary } from "@/platform/cloudinary/fake-cloudinary";
import { createTestDb } from "@/platform/db/testing/test-db";
import { onboardingStatus, publicStore } from "@/domains/stores/service";
import { confirmPayment } from "./service";
import { configurePix, personWith } from "./testing/fixtures";
import { storeInReview } from "./testing/flow";

describe("loja no ar depois do 1º pagamento", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  let cloudinary: FakeCloudinary;
  const deps = () => ({ db: t.db, cloudinary });

  beforeEach(async () => {
    vi.stubEnv("HASH_SECRET", "segredo-de-teste");
    vi.stubEnv("APP_URL", "https://cajugo.test");
    t = await createTestDb();
    cloudinary = new FakeCloudinary();
    await configurePix(t.db);
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await t.close();
  });

  it("[PIX-FR-014] o endereço público só abre depois da confirmação", async () => {
    const { paymentId } = await storeInReview(deps(), "silva-autocar");
    expect(await publicStore(t.db, "silva-autocar")).toBeNull();

    await confirmPayment(deps(), await personWith(t.db, "admin"), {
      paymentId,
    });

    expect(await publicStore(t.db, "silva-autocar")).toMatchObject({
      name: "Loja silva-autocar",
    });
  });

  it("[PIX-FR-012] primeiros passos: 1 de 3 ao ativar; loja completa só com logo, capa, sobre e horário", async () => {
    // Arrange
    const { owner, paymentId } = await storeInReview(deps(), "silva-autocar");
    expect(
      (await onboardingStatus(t.db, owner, { firstVehicle: false })).show,
    ).toBe(false);
    await confirmPayment(deps(), await personWith(t.db, "admin"), {
      paymentId,
    });

    // Act
    const first = await onboardingStatus(t.db, owner, { firstVehicle: false });
    await t.db
      .update(stores)
      .set({
        logoPublicId: "staging/stores/x/logo-1",
        coverPublicId: "staging/stores/x/cover-1",
        about: "Seminovos revisados.",
      })
      .where(eq(stores.id, owner.storeId));
    const withoutHours = await onboardingStatus(t.db, owner, {
      firstVehicle: false,
    });
    await t.db
      .update(stores)
      .set({ hours: { mon: { closed: true } } })
      .where(eq(stores.id, owner.storeId));
    const complete = await onboardingStatus(t.db, owner, {
      firstVehicle: false,
    });

    // Assert
    expect(first).toMatchObject({
      show: true,
      catalogUrl: "https://cajugo.test/loja/silva-autocar",
      steps: { subscription: true, firstVehicle: false, storeComplete: false },
      done: 1,
    });
    expect(withoutHours.steps.storeComplete).toBe(false);
    expect(complete.steps.storeComplete).toBe(true);
    expect(complete.done).toBe(2);
  });
});
