import { getDb } from "@/platform/db/client";
import type { ReactNode } from "react";
import { Logo } from "@/ui/logo";
import { PanelNav } from "@/ui/panel-nav";
import { signOutAction, switchPanelAction } from "../actions";
import { requireArea } from "../guards";
import { rememberPanel } from "../service";
import { PANEL_LABEL } from "../labels";
import { AREA_NAV } from "../navigation";
import type { Area } from "../permissions";
import { noticesFor } from "@/domains/notices/service";
import { NoticeList } from "@/domains/notices/components/notice-list";
import type { AreaNavItem as NavItem } from "../navigation";
import { can } from "../service";
import type { Session } from "@/platform/http/session";

const AREA_ROOT: Record<Area, string> = {
  painel: "/painel",
  rede: "/rede",
  indica: "/indica",
  admin: "/admin",
};

/** Contadores do menu por endereço (ex.: `/admin/alertas` → 2), vindos da rota. */
export type NavCounts = (session: Session) => Promise<Record<string, number>>;

/** Alerta no topo da área, montado pela rota (ex.: fatura do lojista, 011). */
export type Banner = (session: Session) => Promise<ReactNode>;

/** Itens que a pessoa pode abrir, com os contadores que a rota passou. */
async function visibleNav(
  items: NavItem[] | undefined,
  session: Session,
  navCounts?: NavCounts,
): Promise<NavItem[] | undefined> {
  if (!items) return items;
  const allowedItems = items.filter(
    (i) => !i.permission || can(session, i.permission),
  );
  const counts = navCounts ? await navCounts(session) : {};
  return allowedItems.map((item) => {
    const i: NavItem = {
      href: item.href,
      label: item.label,
      mobile: item.mobile,
    };
    return counts[i.href] !== undefined ? { ...i, count: counts[i.href] } : i;
  });
}

/**
 * Moldura das áreas logadas: sessão, papel da área, menu, troca de painel, sair
 * avisos do painel (PIX-FR-013) e o alerta que a rota passar (fatura, 011). A página sempre
 * renderiza e checa a própria permissão (AUT-FR-012).
 */
export async function AreaShell({
  area,
  navCounts,
  banner: renderBanner,
  children,
}: {
  area: Area;
  navCounts?: NavCounts;
  banner?: Banner;
  children: ReactNode;
}) {
  const { session, allowed } = await requireArea(area, AREA_ROOT[area]);
  // Abrir a área pelo endereço também conta como último painel (AUT-FR-006).
  if (allowed) await rememberPanel(getDb(), session, area);
  // Menu só para quem tem a área; sem permissão, nada da área aparece.
  const nav = allowed
    ? await visibleNav(AREA_NAV[area], session, navCounts)
    : undefined;
  // Avisos de quem está conectado, em qualquer área (ADR 0007, PIX-FR-013).
  const notices = allowed ? await noticesFor(getDb(), session) : [];
  const banner = allowed && renderBanner ? await renderBanner(session) : null;

  return (
    <div className="mx-auto flex w-full max-w-[480px] flex-1 flex-col px-4 pb-6 md:max-w-5xl lg:max-w-6xl">
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

      <NoticeList notices={notices} />

      {banner}

      <div className="flex flex-1 gap-8 lg:pt-4">
        {nav && <PanelNav items={nav} />}
        <main
          className={nav ? "min-w-0 flex-1 pb-16 lg:pb-0" : "min-w-0 flex-1"}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
