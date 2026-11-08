import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { activityLog, stores } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import type { Session } from "@/platform/http/session";
import { FakeAuthProvider } from "@/platform/supabase/fake-auth-provider";
import { registerStore, storeSummary, updateStore } from "./service";

const HOURS = {
  mon: { ranges: [{ from: "08:00", to: "18:00" }] },
  tue: { ranges: [{ from: "08:00", to: "18:00" }] },
  wed: { ranges: [{ from: "08:00", to: "18:00" }] },
  thu: { ranges: [{ from: "08:00", to: "18:00" }] },
  fri: { ranges: [{ from: "08:00", to: "18:00" }] },
  sat: { ranges: [{ from: "08:00", to: "12:00" }] },
  sun: { closed: true },
};
const UPDATE = {
  name: "Silva Autocar Seminovos",
  about: "Seminovos revisados desde 1998.",
  whatsapp: "(79) 3211-1234",
  instagram: "https://instagram.com/silvaautocar/",
  addressStreet: "Av. Hermes Fontes",
  addressNumber: "1000",
  addressComplement: "",
  addressDistrict: "Salgado Filho",
  addressZip: "49020-150",
  hours: HOURS,
  shareByDefault: false,
};

describe("Minha loja", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  let auth: FakeAuthProvider;
  const deps = () => ({ db: t.db, auth });

  async function owner(slug: string, email: string): Promise<Session> {
    const { userId, storeId } = await registerStore(
      deps(),
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
    auth = new FakeAuthProvider();
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await t.close();
  });

  it("[STO-FR-008] [STO-FR-009] [STO-FR-012] o lojista salva os dados públicos, o endereço, o horário e a preferência", async () => {
    // Arrange
    const a = await owner("loja-a", "a@x.com");

    // Act
    await updateStore(deps(), a, UPDATE);

    // Assert
    const summary = await storeSummary(t.db, a);
    expect(summary).toMatchObject({
      name: "Silva Autocar Seminovos",
      about: "Seminovos revisados desde 1998.",
      whatsapp: "557932111234",
      instagram: "silvaautocar",
      address: {
        street: "Av. Hermes Fontes",
        number: "1000",
        complement: null,
        district: "Salgado Filho",
        zip: "49020150",
        city: "Aracaju",
        state: "SE",
      },
      hours: HOURS,
      shareByDefault: false,
    });
    const [log] = (await t.db.select().from(activityLog)).filter(
      (l) => l.action === "store.updated",
    );
    expect(log).toMatchObject({ userId: a.userId, entityId: a.storeId });
  });

  it("[STO-FR-008] recusa CEP incompleto e Instagram inválido, sem alterar nada", async () => {
    const a = await owner("loja-a", "a@x.com");

    await expect(
      updateStore(deps(), a, {
        ...UPDATE,
        addressZip: "4902",
        instagram: "nome com espaço",
      }),
    ).rejects.toMatchObject({
      status: 422,
      errors: expect.arrayContaining([
        expect.objectContaining({
          field: "addressZip",
          message: "O CEP tem 8 dígitos.",
        }),
        expect.objectContaining({ field: "instagram" }),
      ]),
    });
    expect((await storeSummary(t.db, a)).name).toBe("Loja");
  });

  it("[STO-SEC-001] o lojista B só altera a própria loja: id de outra loja no formulário é recusado", async () => {
    // Arrange
    const a = await owner("loja-a", "a@x.com");
    const b = await owner("loja-b", "b@x.com");

    // Act
    await expect(
      updateStore(deps(), b, { ...UPDATE, storeId: a.storeId }),
    ).rejects.toMatchObject({ status: 422 });
    await updateStore(deps(), b, { ...UPDATE, name: "Loja B nova" });

    // Assert
    const [storeA] = await t.db
      .select()
      .from(stores)
      .where(eq(stores.id, a.storeId!));
    const [storeB] = await t.db
      .select()
      .from(stores)
      .where(eq(stores.id, b.storeId!));
    expect(storeA.name).toBe("Loja");
    expect(storeB.name).toBe("Loja B nova");
  });

  it("[STO-SEC-003] o usuário da loja não altera Minha loja; visitante precisa entrar", async () => {
    const a = await owner("loja-a", "a@x.com");
    const staff: Session = {
      ...a,
      userId: crypto.randomUUID(),
      roles: ["store_staff"],
      activeRole: "store_staff",
    };

    await expect(updateStore(deps(), staff, UPDATE)).rejects.toMatchObject({
      status: 403,
    });
    await expect(updateStore(deps(), null, UPDATE)).rejects.toMatchObject({
      status: 401,
    });
    await expect(storeSummary(t.db, staff)).rejects.toMatchObject({
      status: 403,
    });
  });

  it("[STO-FR-014] [STO-FR-013] Minha loja mostra o código pessoal e se o endereço pode ser trocado", async () => {
    const a = await owner("loja-a", "a@x.com");

    const summary = await storeSummary(t.db, a);

    expect(summary.referralCode).toMatch(/^DONO\d{2}$/);
    expect(summary.nextSlugChange).toBeNull();
  });
});
