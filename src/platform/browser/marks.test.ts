import { describe, expect, it } from "vitest";
import { claimOncePer } from "./marks";

function memory() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  };
}
const broken = {
  getItem: () => {
    throw new Error("bloqueado");
  },
  setItem: () => {
    throw new Error("bloqueado");
  },
};

const KEY = "cajugo:test:v1";
const DAY_MS = 86_400_000;
const A = "0192f1e0-0000-7000-8000-00000000000a";
const B = "0192f1e0-0000-7000-8000-00000000000b";
const at = (iso: string) => new Date(iso);

describe("marca uma vez por janela no aparelho", () => {
  it("[RPT-FR-010] mesmo id 1 hora depois não conta; 25 horas depois conta de novo", () => {
    // Arrange
    const store = memory();

    // Act / Assert
    expect(
      claimOncePer(store, KEY, A, at("2026-11-16T10:00:00Z"), DAY_MS),
    ).toBe(true);
    expect(
      claimOncePer(store, KEY, A, at("2026-11-16T11:00:00Z"), DAY_MS),
    ).toBe(false);
    expect(
      claimOncePer(store, KEY, B, at("2026-11-16T11:00:00Z"), DAY_MS),
    ).toBe(true);
    expect(
      claimOncePer(store, KEY, A, at("2026-11-17T11:00:00Z"), DAY_MS),
    ).toBe(true);
  });

  it("[RPT-FR-010] chaves diferentes não se misturam", () => {
    // Arrange
    const store = memory();
    claimOncePer(store, KEY, A, at("2026-11-16T10:00:00Z"), DAY_MS);

    // Act / Assert
    expect(
      claimOncePer(
        store,
        "cajugo:other:v1",
        A,
        at("2026-11-16T10:00:00Z"),
        DAY_MS,
      ),
    ).toBe(true);
  });

  it("[RPT-FR-010] sem armazenamento ou com valor corrompido, sempre conta", () => {
    // Arrange
    const store = memory();
    store.setItem(KEY, "{nao-json");

    // Act / Assert
    expect(
      claimOncePer(broken, KEY, A, at("2026-11-16T10:00:00Z"), DAY_MS),
    ).toBe(true);
    expect(
      claimOncePer(store, KEY, A, at("2026-11-16T10:00:00Z"), DAY_MS),
    ).toBe(true);
  });
});
