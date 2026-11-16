import { describe, expect, it, vi } from "vitest";
import {
  FAVORITES_KEY,
  FAVORITES_LIMIT,
  createFavoritesStore,
  type FavoriteSnapshot,
} from "./favorites";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    raw: (k: string) => data.get(k),
  };
}

const car = (n: number): FavoriteSnapshot => ({
  id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
  path: `/v/carro-${n}`,
  title: `Fiat Argo ${n}`,
  priceCents: 5_000_000 + n,
});

describe("favoritos no aparelho", () => {
  it("[BUY-FR-004] favorita e desfavorita, sem duplicar, e avisa quem escuta", () => {
    // Arrange
    const store = createFavoritesStore(memoryStorage());
    const listener = vi.fn();
    store.subscribe(listener);

    // Act / Assert
    expect(store.toggle(car(1))).toBe("added");
    expect(store.has(car(1).id)).toBe(true);
    expect(store.toggle(car(1))).toBe("removed");
    expect(store.has(car(1).id)).toBe(false);
    expect(store.list()).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("[BUY-FR-005] lista do mais recente ao mais antigo, com o preço do momento", () => {
    // Arrange
    let now = Date.parse("2026-11-16T10:00:00Z");
    const store = createFavoritesStore(memoryStorage(), () => new Date(now));

    // Act
    for (const n of [1, 2, 3]) {
      store.toggle(car(n));
      now += 60_000;
    }

    // Assert
    expect(store.list().map((f) => f.title)).toEqual([
      "Fiat Argo 3",
      "Fiat Argo 2",
      "Fiat Argo 1",
    ]);
    expect(store.list()[2]).toMatchObject({
      priceCents: 5_000_001,
      savedAt: "2026-11-16T10:00:00.000Z",
    });
  });

  it("[BUY-FR-004] guarda numa chave versionada e lê de volta noutra tela", () => {
    // Arrange
    const storage = memoryStorage();
    createFavoritesStore(storage).toggle(car(1));

    // Act
    const again = createFavoritesStore(storage);

    // Assert
    expect(FAVORITES_KEY).toBe("cajugo:favorites:v1");
    expect(JSON.parse(storage.raw(FAVORITES_KEY)!)).toMatchObject({ v: 1 });
    expect(again.has(car(1).id)).toBe(true);
  });

  it("[BUY-FR-004] conteúdo estragado ou de outro formato vira lista vazia", () => {
    for (const raw of [
      "{nao é json",
      JSON.stringify({ v: 2, items: [] }),
      JSON.stringify({ v: 1, items: [{ id: "x" }] }),
    ]) {
      const store = createFavoritesStore(
        memoryStorage({ [FAVORITES_KEY]: raw }),
      );
      expect(store.list()).toEqual([]);
    }
  });

  it("[BUY-NFR-004] até 200 favoritos: o seguinte é recusado", () => {
    // Arrange
    const store = createFavoritesStore(memoryStorage());
    for (let n = 0; n < FAVORITES_LIMIT; n++) store.toggle(car(n));

    // Act / Assert
    expect(FAVORITES_LIMIT).toBe(200);
    expect(store.toggle(car(999))).toBe("full");
    expect(store.list()).toHaveLength(200);
    expect(store.toggle(car(0))).toBe("removed");
  });

  it("[BUY-FR-004] a mesma lista volta igual enquanto nada muda (sem renderizar à toa)", () => {
    const store = createFavoritesStore(memoryStorage());
    store.toggle(car(1));
    expect(store.list()).toBe(store.list());
  });
});
