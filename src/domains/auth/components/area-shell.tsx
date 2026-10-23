import Link from "next/link";
import type { ReactNode } from "react";
import { db } from "@/platform/db/client";
import { Logo } from "@/ui/logo";
import { signOutAction, switchPanelAction } from "../actions";
import { requireArea } from "../guards";
import { PANEL_LABEL } from "../labels";
import type { Area } from "../permissions";
import { storeStatusOf } from "../service";

const AREA_ROOT: Record<Area, string> = {
  painel: "/painel",
  rede: "/rede",
  indica: "/indica",
  admin: "/admin",
};

/**
 * Moldura das áreas logadas: sessão, papel da área, troca de painel, sair
 * e o alerta provisório de loja suspensa (AUT-FR-005, 007, 009). A página sempre
 * renderiza e checa a própria permissão (AUT-FR-012).
 */
export async function AreaShell({
  area,
  children,
}: {
  area: Area;
  children: ReactNode;
}) {
  const { session, allowed } = await requireArea(area, AREA_ROOT[area]);
  const storeStatus = await storeStatusOf(db, session.storeId);

  return (
    <div className="mx-auto flex w-full max-w-[480px] flex-1 flex-col px-4 pb-6 md:max-w-5xl">
      <header className="flex min-h-14 items-center justify-between gap-2 border-b border-line">
        <Logo />
        <div className="flex items-center gap-1">
          {session.roles.length > 1 && (
            <form action={switchPanelAction} className="flex items-center">
              <label htmlFor="panel" className="sr-only">
                Trocar de painel
              </label>
              <select
                id="panel"
                name="role"
                defaultValue={session.activeRole}
                className="h-11 rounded-input border border-field bg-surface px-2 text-sm font-semibold"
              >
                {session.roles.map((r) => (
                  <option key={r} value={r}>
                    {PANEL_LABEL[r]}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="h-11 px-2 text-sm font-semibold text-caju-ink"
              >
                Ir
              </button>
            </form>
          )}
          <form action={signOutAction}>
            <button
              type="submit"
              className="h-11 px-3 text-sm font-semibold text-text-2"
            >
              Sair
            </button>
          </form>
        </div>
      </header>

      {area === "painel" && allowed && storeStatus === "suspended" && (
        <div
          role="alert"
          className="mt-3 rounded-card bg-warn-soft p-4 text-sm text-warn"
        >
          <strong className="block">
            Loja suspensa por falta de pagamento
          </strong>
          Seus veículos não aparecem para o público até o pagamento ser
          confirmado.
          {session.roles.includes("store_owner") && (
            <Link
              href="/painel/conta"
              className="mt-2 block font-bold underline underline-offset-2"
            >
              Pagar agora
            </Link>
          )}
        </div>
      )}

      <main className="flex-1">{children}</main>
    </div>
  );
}
