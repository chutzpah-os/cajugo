"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useMemo,
  useTransition,
  type ReactNode,
} from "react";

const Navigation = createContext<{
  pending: boolean;
  /** Nulo fora do catálogo (ex.: busca no cabeçalho): o formulário segue o GET. */
  navigate: ((href: string) => void) | null;
}>({ pending: false, navigate: null });

export const useCatalogNavigation = () => useContext(Navigation);

/**
 * Troca de filtro, busca e ordem como transição do cliente: a lista vira esqueleto
 * [12c] enquanto a nova chega, sem `<Suspense>` em volta do conteúdo indexável.
 */
export function CatalogNavigation({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const value = useMemo(
    () => ({
      pending,
      navigate: (href: string) => start(() => router.push(href)),
    }),
    [pending, router],
  );
  return <Navigation value={value}>{children}</Navigation>;
}
