import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { profiles } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { FakeAuthProvider } from "@/platform/supabase/fake-auth-provider";
import { personWith, storeOwner } from "@/domains/billing/testing/fixtures";
import { registerReferrer } from "./service";

const FORM = {
  name: "Júlia Lima",
  phone: "79999887766",
  email: "julia@x.com",
  password: "senha-forte-1",
  terms: true,
};

describe("cadastro do indicador [9b]", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  let auth: FakeAuthProvider;
  const deps = () => ({ db: t.db, auth });
  const ctx = () => ({ ipHash: crypto.randomUUID() });

  beforeEach(async () => {
    t = await createTestDb();
    auth = new FakeAuthProvider();
  });
  afterEach(() => t.close());

  it("[IND-FR-004] visitante cria a conta com o papel de indicador", async () => {
    // Act
    const { userId } = await registerReferrer(deps(), null, FORM, ctx());

    // Assert
    const [row] = await t.db
      .select()
      .from(profiles)
      .where(eq(profiles.id, userId!));
    expect(row).toMatchObject({
      name: "Júlia Lima",
      email: "julia@x.com",
      roles: ["referrer"],
    });
  });

  it("[IND-FR-004] quem já tem conta ganha o papel na mesma conta; e-mail existente sem sessão pede para entrar", async () => {
    const owner = await storeOwner(t.db, "loja-r", "r@x.com");

    await registerReferrer(deps(), owner, { terms: true }, ctx());
    await expect(
      registerReferrer(deps(), null, { ...FORM, email: "r@x.com" }, ctx()),
    ).rejects.toMatchObject({ status: 422 });

    const [row] = await t.db
      .select({ roles: profiles.roles })
      .from(profiles)
      .where(eq(profiles.id, owner.userId));
    expect(row.roles.sort()).toEqual(["referrer", "store_owner"]);
  });

  it("[IND-FR-004] campo isca: sucesso falso e nada criado; sem termos é recusado; equipe não vira indicador", async () => {
    const fake = await registerReferrer(deps(), null, FORM, {
      ...ctx(),
      honeypotFilled: true,
    });
    await expect(
      registerReferrer(deps(), null, { ...FORM, terms: false }, ctx()),
    ).rejects.toMatchObject({ status: 422 });
    const support = await personWith(t.db, "support");
    await expect(
      registerReferrer(deps(), support, { terms: true }, ctx()),
    ).rejects.toMatchObject({ status: 403 });

    expect(fake.userId).toBeNull();
    expect(
      await t.db.select().from(profiles).where(eq(profiles.email, FORM.email)),
    ).toHaveLength(0);
  });

  it("[IND-FR-004] limite por rede", async () => {
    const same = ctx();
    let blocked = false;
    for (let i = 0; i < 30 && !blocked; i++)
      await registerReferrer(
        deps(),
        null,
        { ...FORM, email: `j${i}@x.com` },
        same,
      ).catch((e: { status?: number }) => {
        if (e.status === 429) blocked = true;
      });

    expect(blocked).toBe(true);
  });
});
