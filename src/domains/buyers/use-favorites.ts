"use client";

import { useSyncExternalStore } from "react";
import {
  createFavoritesStore,
  FAVORITES_KEY,
  type FavoriteEntry,
  type FavoriteSnapshot,
} from "./favorites";

/** Favoritos do navegador: uma loja por aba, avisada quando outra aba muda (BUY-FR-004). */
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
const SERVER_LIST: FavoriteEntry[] = [];
const serverList = () => SERVER_LIST;

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
