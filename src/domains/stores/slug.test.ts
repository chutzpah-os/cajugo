import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { profiles, storeSlugRedirects, stores } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { checkSlug, slugSchema, suggestSlug } from "./slug";

describe("endereço do catálogo", () => {
  it("[STO-FR-005] sugere a partir do nome: minúsculas, sem acento, com hífen", () => {
    expect(suggestSlug("Silva Autocar")).toBe("silva-autocar");
    expect(suggestSlug("  Auto Center São João & Filhos!! ")).toBe(
      "auto-center-sao-joao-filhos",
    );
    expect(suggestSlug("AB")).toBe("ab-loja");
    expect(suggestSlug("x".repeat(60))).toHaveLength(40);
    expect(suggestSlug("Loja " + "a".repeat(40))).not.toMatch(/-$/);
  });

  it("[STO-FR-005] aceita só letras minúsculas, números e hífen, 3–40, sem hífen nas pontas", () => {
    for (const ok of ["silvautocar", "silva-autocar", "loja123", "a1b"])
      expect(slugSchema.safeParse(ok).success, ok).toBe(true);
    for (const bad of [
      "Silva_Autocar",
      "-silva",
      "silva-",
      "ab",
      "silva autocar",
      "são-joão",
      "a".repeat(41),
      "silva--autocar",
    ])
      expect(slugSchema.safeParse(bad).success, bad).toBe(false);
  });
});

describe("checkSlug", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  beforeEach(async () => {
    t = await createTestDb();
    const owner = crypto.randomUUID();
    await t.db.insert(profiles).values({
      id: owner,
      name: "Dono",
      email: "d@x.com",
      roles: ["store_owner"],
    });
    const [store] = await t.db
      .insert(stores)
      .values({
        name: "Silva Autocar",
        slug: "silvautocar",
        city: "Aracaju",
        state: "SE",
        whatsapp: "5579999999999",
        ownerId: owner,
      })
      .returning({ id: stores.id });
    await t.db.insert(storeSlugRedirects).values({
      oldSlug: "silva-antiga",
      storeId: store.id,
      expiresAt: new Date(Date.now() + 86_400_000),
    });
  });
  afterEach(async () => {
    await t.close();
  });

  it("[STO-FR-005] em uso, livre ou inválido", async () => {
    expect(await checkSlug(t.db, "silvautocar")).toEqual({ status: "taken" });
    expect(await checkSlug(t.db, "silvautocar-campinas")).toEqual({
      status: "available",
    });
    expect(await checkSlug(t.db, "Silva_Autocar")).toMatchObject({
      status: "invalid",
    });
  });

  it("[STO-FR-013] endereço antigo ainda redirecionando não pode ser usado por outra loja", async () => {
    expect(await checkSlug(t.db, "silva-antiga")).toEqual({ status: "taken" });
  });
});
