import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { profiles, sellers } from "@/platform/db/schema";
import { createTestDb } from "@/platform/db/testing/test-db";
import { FakeAuthProvider } from "@/platform/supabase/fake-auth-provider";
import { registerSeller } from "./service";

const NOW = new Date("2026-11-16T12:00:00Z");
export const SELLER_FORM = {
  name: "Ana Souza",
  cpf: "529.982.247-25",
  phone: "(79) 99999-0000",
  email: "ana@exemplo.com",
  city: "Aracaju",
  pixType: "email",
  pixKey: "ana@exemplo.com",
  password: "senha-forte-1",
  terms: true,
};

describe("cadastro do vendedor (visitante)", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  let auth: FakeAuthProvider;
  const deps = () => ({ db: t.db, auth, now: () => NOW });
  const ctx = { ipHash: "rede-a" };

  beforeEach(async () => {
    vi.stubEnv("HASH_SECRET", "segredo-de-teste");
    t = await createTestDb();
    auth = new FakeAuthProvider();
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await t.close();
  });

  it("[SEL-FR-001] cria a conta com o papel de vendedor, CPF e Pix, e o vendedor Em análise", async () => {
    // Act
    const { userId } = await registerSeller(deps(), null, SELLER_FORM, ctx);

    // Assert
    expect(await auth.verifyPassword("ana@exemplo.com", "senha-forte-1")).toBe(
      true,
    );
    const [p] = await t.db
      .select()
      .from(profiles)
      .where(eq(profiles.id, userId!));
    expect(p).toMatchObject({
      name: "Ana Souza",
      roles: ["seller"],
      cpf: "52998224725",
      phone: "5579999990000",
      pixKey: "ana@exemplo.com",
      pixKeyType: "email",
    });
    expect(await t.db.select().from(sellers)).toEqual([
      expect.objectContaining({
        profileId: userId,
        city: "Aracaju",
        status: "in_review",
        code: null,
      }),
    ]);
  });

  it("[SEL-SEC-003] CPF já cadastrado é recusado no campo, sem criar conta", async () => {
    // Arrange
    await registerSeller(deps(), null, SELLER_FORM, ctx);

    // Act / Assert
    await expect(
      registerSeller(
        deps(),
        null,
        { ...SELLER_FORM, email: "outra@exemplo.com" },
        ctx,
      ),
    ).rejects.toMatchObject({
      status: 422,
      errors: [
        expect.objectContaining({
          field: "cpf",
          message: "CPF já cadastrado.",
        }),
      ],
    });
    expect(
      await auth.verifyPassword("outra@exemplo.com", "senha-forte-1"),
    ).toBe(false);
  });

  it("[SEL-FR-016] e-mail que já tem conta pede para entrar", async () => {
    // Arrange
    await registerSeller(deps(), null, SELLER_FORM, ctx);

    // Act / Assert
    await expect(
      registerSeller(
        deps(),
        null,
        { ...SELLER_FORM, cpf: "111.444.777-35" },
        ctx,
      ),
    ).rejects.toMatchObject({
      errors: [
        expect.objectContaining({
          field: "email",
          code: "account_exists",
        }),
      ],
    });
  });

  it("[SEL-SEC-003] honeypot finge sucesso sem criar conta; o 6º envio da rede no minuto é recusado", async () => {
    // Act
    const trap = await registerSeller(deps(), null, SELLER_FORM, {
      ipHash: "rede-bot",
      honeypotFilled: true,
    });
    const attempts = [];
    for (let i = 0; i < 6; i++)
      attempts.push(
        registerSeller(deps(), null, { ...SELLER_FORM, cpf: "1" }, ctx).catch(
          (e: { status: number }) => e.status,
        ),
      );
    const statuses = await Promise.all(attempts);

    // Assert
    expect(trap).toEqual({ userId: null });
    expect(await t.db.select().from(sellers)).toEqual([]);
    expect(statuses.filter((s) => s === 429)).toHaveLength(1);
  });
});
