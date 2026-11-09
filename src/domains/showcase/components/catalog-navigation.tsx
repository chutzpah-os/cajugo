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
  navigate: (href: string) => void;
}>({ pending: false, navigate: () => {} });

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
