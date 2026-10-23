import { Suspense, type ReactNode } from "react";
import { Skeleton } from "@/ui/skeleton";
import type { Area } from "../permissions";
import { AreaShell } from "./area-shell";

/** Layout de área logada: a sessão é lida por requisição, dentro de `<Suspense>`. */
export function AreaLayout({
  area,
  children,
}: {
  area: Area;
  children: ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex w-full max-w-[480px] flex-col gap-3 px-4 pt-4">
          <Skeleton className="h-10" />
          <Skeleton className="h-24" />
        </div>
      }
    >
      <AreaShell area={area}>{children}</AreaShell>
    </Suspense>
  );
}

/**
 * Conteúdo de página logada: o que lê a sessão fica dentro de `<Suspense>`
 * para a navegação mostrar a moldura na hora (navegação instantânea do Next 16).
 */
export function AreaPage({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-3 py-6">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-7 w-48" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
