import { describe, expect, it } from "vitest";
import { FakeAuthProvider } from "./fake-auth-provider";

describe("FakeAuthProvider (contrato do AuthProvider)", () => {
  it("entra com a senha certa e recusa a errada", async () => {
    const auth = new FakeAuthProvider();
    const user = await auth.adminCreateUser(
      "Lojista@Example.com",
      "senha-boa-123",
    );
    expect(
      await auth.signInWithPassword("lojista@example.com", "errada"),
    ).toBeNull();
    expect(
      await auth.signInWithPassword("lojista@example.com", "senha-boa-123"),
    ).toEqual(user);
    expect(await auth.getUser()).toEqual(user);
  });

  it("signOut('others') mantém este aparelho e derruba os outros", async () => {
    // Arrange
    const phone = new FakeAuthProvider();
    await phone.adminCreateUser("a@example.com", "senha-boa-123");
    const laptop = phone.device();
    await phone.signInWithPassword("a@example.com", "senha-boa-123");
    await laptop.signInWithPassword("a@example.com", "senha-boa-123");

    // Act
    await phone.signOut("others");

    // Assert
    expect(await phone.getUser()).not.toBeNull();
    expect(await laptop.getUser()).toBeNull();
  });

  it("[CFG-SEC-005] verifyPassword confere a senha sem abrir nem trocar sessão", async () => {
    // Arrange: conectado com a conta A
    const auth = new FakeAuthProvider();
    const a = await auth.adminCreateUser("a@x.com", "senha-a-123");
    await auth.adminCreateUser("b@x.com", "senha-b-123");
    await auth.signInWithPassword("a@x.com", "senha-a-123");

    // Act
    const right = await auth.verifyPassword("A@x.com", "senha-a-123");
    const wrong = await auth.verifyPassword("a@x.com", "errada-123");
    const other = await auth.verifyPassword("b@x.com", "senha-b-123");

    // Assert: respostas certas e a sessão de A continua a mesma
    expect([right, wrong, other]).toEqual([true, false, true]);
    expect(await auth.getUser()).toMatchObject({ id: a.id });
  });
});
