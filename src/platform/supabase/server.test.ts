import { describe, expect, it } from "vitest";
import { AUTH_COOKIE_OPTIONS, withSessionMaxAge } from "./server";

describe("cookies de sessão", () => {
  it("[AUT-SEC-006] não ficam acessíveis a scripts da página", () => {
    expect(AUTH_COOKIE_OPTIONS.httpOnly).toBe(true);
    expect(AUTH_COOKIE_OPTIONS.sameSite).toBe("lax");
  });

  it("[AUT-FR-004] duram 30 dias, renovados com o uso", () => {
    expect(AUTH_COOKIE_OPTIONS.maxAge).toBe(30 * 24 * 60 * 60);
  });

  it("[AUT-FR-004] corrige os 400 dias que o @supabase/ssr grava, sem afetar a remoção", () => {
    expect(withSessionMaxAge({ maxAge: 400 * 24 * 60 * 60 }).maxAge).toBe(
      30 * 24 * 60 * 60,
    );
    expect(withSessionMaxAge({ maxAge: 0 }).maxAge).toBe(0);
  });
});
