import { useSyncExternalStore } from "react";
import { z } from "zod";

/**
 * Favoritos guardados no aparelho [14a] (BUY-FR-004, BUY-SEC-001): a CajuGo não sabe
 * quem favoritou. Sincronizar com conta é fase 2. O `localStorage` fica escondido aqui.
 */
export const FAVORITES_KEY = "cajugo:favorites:v1";
export const FAVORITES_LIMIT = 200;

const snapshotSchema = z.object({
  id: z.uuid(),
  path: z.string().startsWith("/v/").max(300),
  title: z.string().min(1).max(200),
  priceCents: z.number().int().nonnegative().nullable(),
});
const entrySchema = snapshotSchema.extend({ savedAt: z.iso.datetime() });
const fileSchema = z.object({
  v: z.literal(1),
  items: z.array(entrySchema).max(FAVORITES_LIMIT),
});

/** O que o card entrega ao favoritar: o preço é o do momento (selo "Baixou", BUY-FR-006). */
export type FavoriteSnapshot = z.infer<typeof snapshotSchema>;
export type FavoriteEntry = z.infer<typeof entrySchema>;
export type ToggleResult = "added" | "removed" | "full";

type KeyValueStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

const EMPTY: FavoriteEntry[] = [];

function parse(raw: string | null): FavoriteEntry[] {
  if (!raw) return EMPTY;
  try {
    const file = fileSchema.safeParse(JSON.parse(raw));
    return file.success ? file.data.items : EMPTY;
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
      const entry = snapshotSchema.parse(snapshot);
      write([{ ...entry, savedAt: now().toISOString() }, ...items]);
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
