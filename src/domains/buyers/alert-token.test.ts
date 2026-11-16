import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cancelToken, alertIdFromToken } from "./alert-token";

const A = "0192f1e0-0000-7000-8000-000000000001";
const B = "0192f1e0-0000-7000-8000-000000000002";

describe("link de cancelar o alerta", () => {
  beforeEach(() => vi.stubEnv("HASH_SECRET", "segredo-de-teste"));
  afterEach(() => vi.unstubAllEnvs());

  it("[ALR-SEC-005] o link do alerta leva só a ele", () => {
    // Act
    const token = cancelToken(A);

    // Assert
    expect(token).toMatch(/^[0-9a-f-]{36}\.[A-Za-z0-9_-]{22,}$/);
    expect(alertIdFromToken(token)).toBe(A);
    expect(cancelToken(A)).toBe(token);
    expect(cancelToken(B)).not.toBe(token);
  });

  it("[ALR-SEC-005] link adulterado, de outro alerta ou fora do formato não vale", () => {
    // Arrange
    const token = cancelToken(A);
    const [, mac] = token.split(".");
    const flip = (s: string) => s.slice(0, -1) + (s.endsWith("A") ? "B" : "A");

    // Act / Assert
    for (const bad of [
      flip(token),
      `${B}.${mac}`,
      A,
      `${A}.`,
      `nao-e-uuid.${mac}`,
      "",
      `${A}.${mac}.x`,
    ])
      expect(alertIdFromToken(bad), bad).toBeNull();
  });

  it("[ALR-SEC-005] com outro segredo, o link antigo não vale", () => {
    const token = cancelToken(A);
    vi.stubEnv("HASH_SECRET", "outro-segredo");
    expect(alertIdFromToken(token)).toBeNull();
  });
});
