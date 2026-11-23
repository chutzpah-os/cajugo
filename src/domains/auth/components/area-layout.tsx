import { Suspense, type ReactNode } from "react";
import { Skeleton } from "@/ui/skeleton";
import type { Area } from "../permissions";
import { AreaShell, type Banner, type NavCounts } from "./area-shell";

/** Layout de área logada: a sessão é lida por requisição, dentro de `<Suspense>`. */
export function AreaLayout({
  area,
  navCounts,
  banner,
  children,
}: {
  area: Area;
  /** Contadores do menu, calculados pela rota (o domínio dono do dado). */
  navCounts?: NavCounts;
  /** Alerta no topo, montado pela rota (fatura do lojista, 011). */
  banner?: Banner;
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
      <AreaShell area={area} navCounts={navCounts} banner={banner}>
        {children}
      </AreaShell>
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
