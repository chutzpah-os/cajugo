"use client";

import { useState } from "react";
import { Button } from "./button";

export type Page<T> = { items: T[]; nextCursor: string | null };

/** Acrescenta a página nova; quem já está na lista não entra de novo. */
export function mergePage<T>(
  current: T[],
  page: T[],
  idOf: (item: T) => string,
): T[] {
  const seen = new Set(current.map(idOf));
  return [...current, ...page.filter((item) => !seen.has(idOf(item)))];
}

/**
 * Paginação por cursor do lado do cliente. A 1ª página vem do servidor em `initial` e
 * continua seguindo o que ele manda; só as páginas seguintes ficam aqui.
 * `fetchPage` devolve `null` quando falha.
 */
export function useLoadMore<T>({
  initial,
  nextCursor,
  idOf,
  fetchPage,
}: {
  initial: T[];
  nextCursor: string | null;
  idOf: (item: T) => string;
  fetchPage: (cursor: string) => Promise<Page<T> | null>;
}) {
  const [extra, setExtra] = useState<T[]>([]);
  const [cursor, setCursor] = useState(nextCursor);
  const [pages, setPages] = useState(0);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function load() {
    if (!cursor || busy) return;
    setBusy(true);
    setFailed(false);
    const page = await fetchPage(cursor);
    setBusy(false);
    if (!page) {
      setFailed(true);
      return;
    }
    setExtra((list) => mergePage(list, page.items, idOf));
    setCursor(page.nextCursor);
    setPages((n) => n + 1);
  }

  /** Busca de novo as páginas já abertas, depois de uma mudança num item delas. */
  async function reload() {
    if (!pages || !nextCursor) return;
    let list: T[] = [];
    let next: string | null = nextCursor;
    for (let i = 0; i < pages && next; i++) {
      const page: Page<T> | null = await fetchPage(next);
      if (!page) return;
      list = mergePage(list, page.items, idOf);
      next = page.nextCursor;
    }
    setExtra(list);
    setCursor(next);
  }

  return {
    items: mergePage(initial, extra, idOf),
    hasMore: cursor !== null,
    busy,
    failed,
    load,
    reload,
  };
}

/** "Carregar mais veículos"; erro aparece aqui mesmo, sem sair da tela [12b]. */
export function LoadMoreButton({
  busy,
  failed,
  onClick,
  noun = "veículos",
}: {
  busy: boolean;
  failed: boolean;
  onClick: () => void;
  /** O que a lista mostra ("vendas" no extrato, 008b). */
  noun?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      {failed && (
        <p role="alert" className="text-sm text-caju-deep">
          Não foi possível carregar mais {noun}.
        </p>
      )}
      <Button
        variant="ghost"
        disabled={busy}
        onClick={onClick}
        data-testid="load-more"
      >
        {busy
          ? "Carregando…"
          : failed
            ? "Tentar de novo"
            : `Carregar mais ${noun}`}
      </Button>
    </div>
  );
}
