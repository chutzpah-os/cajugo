import { useSyncExternalStore } from "react";

/**
 * Favoritos guardados no aparelho [14a] (BUY-FR-004, BUY-SEC-001): a CajuGo não sabe
 * quem favoritou. Sincronizar com conta é fase 2. O `localStorage` fica escondido aqui.
 */
export const FAVORITES_KEY = "cajugo:favorites:v1";
export const FAVORITES_LIMIT = 200;

/** O que o card entrega ao favoritar: o preço é o do momento (selo "Baixou", BUY-FR-006). */
export type FavoriteSnapshot = {
  id: string;
  path: string;
  title: string;
  priceCents: number | null;
};
export type FavoriteEntry = FavoriteSnapshot & { savedAt: string };
export type ToggleResult = "added" | "removed" | "full";

// Validação à mão, sem zod: este arquivo vai para o navegador em toda página pública.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const text = (v: unknown, max: number): v is string =>
  typeof v === "string" && v.length > 0 && v.length <= max;

function isSnapshot(v: unknown): v is FavoriteSnapshot {
  if (typeof v !== "object" || v === null) return false;
  const f = v as Record<string, unknown>;
  return (
    typeof f.id === "string" &&
    UUID.test(f.id) &&
    text(f.path, 300) &&
    f.path.startsWith("/v/") &&
    text(f.title, 200) &&
    (f.priceCents === null ||
      (Number.isInteger(f.priceCents) && (f.priceCents as number) >= 0))
  );
}

function isEntry(v: unknown): v is FavoriteEntry {
  if (!isSnapshot(v)) return false;
  const savedAt = (v as Record<string, unknown>).savedAt;
  return typeof savedAt === "string" && !Number.isNaN(Date.parse(savedAt));
}

type KeyValueStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

const EMPTY: FavoriteEntry[] = [];

function parse(raw: string | null): FavoriteEntry[] {
  if (!raw) return EMPTY;
  try {
    const file: unknown = JSON.parse(raw);
    if (typeof file !== "object" || file === null) return EMPTY;
    const { v, items } = file as { v?: unknown; items?: unknown };
    return v === 1 &&
      Array.isArray(items) &&
      items.length <= FAVORITES_LIMIT &&
      items.every(isEntry)
      ? items
      : EMPTY;
  } catch {
    return EMPTY;
  }
}

/** Mais recente primeiro; o mesmo array enquanto o conteúdo não muda. */
export function createFavoritesStore(
  storage: KeyValueStorage,
  now: () => Date = () => new Date(),
) {
  const listeners = new Set<() => void>();
  let cachedRaw: string | null | undefined;
  let cached: FavoriteEntry[] = EMPTY;

  function read(): string | null {
    try {
      return storage.getItem(FAVORITES_KEY);
    } catch {
      return null;
    }
  }

  function list(): FavoriteEntry[] {
    const raw = read();
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cached = parse(raw);
    }
    return cached;
  }

  function write(items: FavoriteEntry[]) {
    try {
      storage.setItem(FAVORITES_KEY, JSON.stringify({ v: 1, items }));
    } catch {
      // Sem espaço ou bloqueado: o favorito não fica, e a tela continua como estava.
      return;
    }
    notify();
  }

  function notify() {
    for (const listener of listeners) listener();
  }

  return {
    list,
    has: (id: string) => list().some((f) => f.id === id),
    toggle(snapshot: FavoriteSnapshot): ToggleResult {
      const items = list();
      if (items.some((f) => f.id === snapshot.id)) {
        write(items.filter((f) => f.id !== snapshot.id));
        return "removed";
      }
      if (items.length >= FAVORITES_LIMIT) return "full";
      if (!isSnapshot(snapshot)) throw new Error("Favorito inválido.");
      const { id, path, title, priceCents } = snapshot;
      const entry = {
        id,
        path,
        title,
        priceCents,
        savedAt: now().toISOString(),
      };
      write([entry, ...items]);
      return "added";
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    /** Outra aba mudou os favoritos (evento `storage`). */
    notify,
  };
}

type FavoritesStore = ReturnType<typeof createFavoritesStore>;
let browserStore: FavoritesStore | null = null;

function store(): FavoritesStore {
  if (!browserStore) {
    browserStore = createFavoritesStore(window.localStorage);
    window.addEventListener("storage", (e) => {
      if (e.key === FAVORITES_KEY) browserStore!.notify();
    });
  }
  return browserStore;
}

const subscribe = (listener: () => void) => store().subscribe(listener);
/** No servidor e na hidratação, nada favoritado: o HTML é igual para todos (BUY-NFR-002). */
const serverList = () => EMPTY;

export function useFavorites(): FavoriteEntry[] {
  return useSyncExternalStore(subscribe, () => store().list(), serverList);
}

export function useFavorite(id: string) {
  const saved = useSyncExternalStore(
    subscribe,
    () => store().has(id),
    () => false,
  );
  return {
    saved,
    toggle: (snapshot: FavoriteSnapshot) => store().toggle(snapshot),
  };
}
