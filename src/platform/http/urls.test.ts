import { afterEach, describe, expect, it, vi } from "vitest";
import { appUrl, storeUrl } from "./urls";

describe("endereço público do site", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("usa APP_URL sem barra no fim e monta o endereço da loja", () => {
    vi.stubEnv("APP_URL", " https://cajugo.vercel.app/ ");

    expect(appUrl()).toBe("https://cajugo.vercel.app");
    expect(storeUrl("silvautocar")).toBe(
      "https://cajugo.vercel.app/loja/silvautocar",
    );
  });

  it("sem APP_URL, local e Preview usam localhost", () => {
    vi.stubEnv("APP_URL", "");
    vi.stubEnv("VERCEL_ENV", "preview");

    expect(appUrl()).toBe("http://localhost:3000");
  });

  it("sem APP_URL na produção, para com erro em vez de usar localhost", () => {
    vi.stubEnv("APP_URL", "");
    vi.stubEnv("VERCEL_ENV", "production");

    expect(() => appUrl()).toThrow("Defina APP_URL");
  });
});
