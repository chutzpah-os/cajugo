import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { activityLog, stores } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import type { Session } from "@/platform/http/session";
import { FakeAuthProvider } from "@/platform/supabase/fake-auth-provider";
import { changeSlug, registerStore, resolveSlug } from "./service";

const DAY = 86_400_000;
const T0 = new Date("2026-11-08T12:00:00Z");

describe("troca do endereço do catálogo", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  let now: Date;
  const deps = () => ({
    db: t.db,
    auth: new FakeAuthProvider(),
    now: () => now,
  });

  async function owner(slug: string, email: string): Promise<Session> {
    const { userId, storeId } = await registerStore(
      { db: t.db, auth: new FakeAuthProvider(), now: () => now },
      null,
      {
        storeName: "Loja",
        city: "Aracaju",
        state: "SE",
        whatsapp: "79981360206",
        slug,
        name: "Dono",
        email,
        phone: `7998${Math.floor(1000000 + Math.random() * 8999999)}`,
        password: "senha-forte-1",
        terms: true,
      },
      { ipHash: crypto.randomUUID() },
    );
    return {
      userId,
      roles: ["store_owner"],
      activeRole: "store_owner",
      storeId,
      mustChangePassword: false,
    };
  }

  beforeEach(async () => {
    vi.stubEnv("HASH_SECRET", "segredo-de-teste");
    t = await createTestDb();
    now = T0;
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await t.close();
  });

  it("[STO-FR-013] troca o endereço e o antigo leva ao novo por 90 dias", async () => {
    // Arrange
    const a = await owner("silvautocar", "a@x.com");

    // Act
    await changeSlug(deps(), a, "silva-autocar");

    // Assert
    const [store] = await t.db
      .select()
      .from(stores)
      .where(eq(stores.id, a.storeId!));
    expect(store).toMatchObject({ slug: "silva-autocar", slugChangedAt: T0 });
    expect(
      await resolveSlug(t.db, "silvautocar", new Date(T0.getTime() + 89 * DAY)),
    ).toEqual({
      storeId: a.storeId,
      slug: "silva-autocar",
      redirected: true,
    });
    expect(
      await resolveSlug(t.db, "silvautocar", new Date(T0.getTime() + 91 * DAY)),
    ).toBeNull();
    expect(await resolveSlug(t.db, "silva-autocar")).toEqual({
      storeId: a.storeId,
      slug: "silva-autocar",
      redirected: false,
    });
    const log = (await t.db.select().from(activityLog)).find(
      (l) => l.action === "store.slug_changed",
    );
    expect(log).toMatchObject({
      entityId: a.storeId,
      data: { from: "silvautocar", to: "silva-autocar" },
    });
  });

  it("[STO-FR-013] no máximo uma troca a cada 30 dias, informando a partir de quando", async () => {
    const a = await owner("silvautocar", "a@x.com");
    await changeSlug(deps(), a, "silva-autocar");

    now = new Date(T0.getTime() + 10 * DAY);
    await expect(changeSlug(deps(), a, "silva-motors")).rejects.toMatchObject({
      status: 422,
      errors: [
        expect.objectContaining({
          field: "slug",
          message: "Você poderá trocar de novo a partir de 08/12/2026.",
        }),
      ],
    });

    now = new Date(T0.getTime() + 30 * DAY);
    await changeSlug(deps(), a, "silva-motors");
    const [store] = await t.db
      .select()
      .from(stores)
      .where(eq(stores.id, a.storeId!));
    expect(store.slug).toBe("silva-motors");
  });

  it("[STO-FR-013] voltar ao endereço antigo da própria loja é permitido", async () => {
    const a = await owner("silvautocar", "a@x.com");
    await changeSlug(deps(), a, "silva-autocar");
    now = new Date(T0.getTime() + 31 * DAY);

    await changeSlug(deps(), a, "silvautocar");

    expect(await resolveSlug(t.db, "silvautocar")).toMatchObject({
      redirected: false,
    });
    expect(await resolveSlug(t.db, "silva-autocar")).toMatchObject({
      slug: "silvautocar",
      redirected: true,
    });
  });

  it("[STO-FR-013] [STO-SEC-001] endereço em uso (de outra loja) ou inválido é recusado", async () => {
    const a = await owner("silvautocar", "a@x.com");
    const b = await owner("loja-b", "b@x.com");

    await expect(changeSlug(deps(), b, "silvautocar")).rejects.toMatchObject({
      status: 409,
    });
    await expect(changeSlug(deps(), b, "Loja_B")).rejects.toMatchObject({
      status: 422,
    });
    const [storeA] = await t.db
      .select()
      .from(stores)
      .where(eq(stores.id, a.storeId!));
    expect(storeA.slug).toBe("silvautocar");
  });

  it("[STO-SEC-003] usuário da loja não troca o endereço", async () => {
    const a = await owner("silvautocar", "a@x.com");
    const staff: Session = {
      ...a,
      userId: crypto.randomUUID(),
      roles: ["store_staff"],
      activeRole: "store_staff",
    };

    await expect(
      changeSlug(deps(), staff, "outro-endereco"),
    ).rejects.toMatchObject({ status: 403 });
  });
});
