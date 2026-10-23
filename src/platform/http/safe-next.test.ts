import { describe, expect, it } from "vitest";
import { safeNext } from "./safe-next";

const fallback = "/painel/veiculos";

describe("safeNext", () => {
  it("[AUT-FR-011] volta para o caminho interno pedido, com query", () => {
    expect(safeNext("/painel/leads?status=novo", fallback)).toBe(
      "/painel/leads?status=novo",
    );
  });

  it("[AUT-SEC-005] recusa site externo e cai no painel do papel", () => {
    for (const next of [
      "https://evil.com",
      "//evil.com",
      "/\\evil.com",
      "\\\\evil.com",
      "/%2F%2Fevil.com",
      "/%5Cevil.com",
      "javascript:alert(1)",
      "painel",
      "/painel\nSet-Cookie: x",
      "",
      null,
      undefined,
    ]) {
      expect(safeNext(next, fallback)).toBe(fallback);
    }
  });

  it("[AUT-SEC-005] não volta para o próprio login (evita laço)", () => {
    expect(safeNext("/entrar?next=/painel", fallback)).toBe(fallback);
  });
});
