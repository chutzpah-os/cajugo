import { getDb } from "@/platform/db/client";
import type { ReactNode } from "react";
import { PanelNav, type SidebarIdentity } from "@/ui/panel-nav";
import { requireArea } from "../guards";
import { accountMenu, rememberPanel } from "../service";
import { PANEL_LABEL } from "../labels";
import { AREA_NAV } from "../navigation";
import type { Area } from "../permissions";
import { noticesFor } from "@/domains/notices/service";
import { NoticeList } from "@/domains/notices/components/notice-list";
import type { AreaNavItem as NavItem } from "../navigation";
import { can } from "../service";
import type { Session } from "@/platform/http/session";
import { AccountMenu } from "./account-menu";

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

/** Card da sidebar do desktop [15b] (a loja, a pessoa), montado pela rota (012). */
export type Identity = (session: Session) => Promise<SidebarIdentity | null>;

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
 * Moldura das áreas logadas (DESIGN.md §3, 012):
 * - celular: o cabeçalho é da página (escuro ou claro); a moldura põe o avatar com o
 *   menu da conta no canto dele, os avisos logo abaixo e a barra inferior fixa;
 * - desktop: a sidebar escura com o logo, a identidade, os itens com contadores e a
 *   conta no pé.
 * A página sempre renderiza e checa a própria permissão (AUT-FR-012).
 */
export async function AreaShell({
  area,
  navCounts,
  banner: renderBanner,
  identity: renderIdentity,
  children,
}: {
  area: Area;
  navCounts?: NavCounts;
  banner?: Banner;
  identity?: Identity;
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
  const identity =
    allowed && renderIdentity ? await renderIdentity(session) : null;
  const me = await accountMenu(getDb(), session);
  const account = {
    fullName: me?.fullName ?? "Conta",
    panels: session.roles.map((r) => ({ role: r, label: PANEL_LABEL[r] })),
    activeRole: session.activeRole,
  };
  const lightHeader = area === "admin";

  return (
    <div className="flex w-full flex-1 flex-col lg:pl-60">
      {nav && (
        <PanelNav
          items={nav}
          identity={identity}
          tag={area === "admin" ? "Admin" : undefined}
          footer={<AccountMenu {...account} variant="sidebar" />}
        />
      )}
      <div className="relative mx-auto flex w-full max-w-[480px] flex-1 flex-col px-4 pb-28 md:max-w-3xl lg:max-w-6xl lg:px-8 lg:pt-6 lg:pb-10">
        <div className="absolute top-[22px] right-4 z-10 lg:hidden">
          <AccountMenu
            {...account}
            variant={lightHeader ? "avatar-light" : "avatar-dark"}
          />
        </div>
        {/* O cabeçalho da página vem primeiro, os avisos logo abaixo (012). */}
        <main className="flex min-w-0 flex-1 flex-col *:order-2 [&>[data-header]]:order-0 [&>[data-notices]]:order-1">
          <div data-notices className="flex flex-col empty:hidden">
            <NoticeList notices={notices} />
            {banner}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
