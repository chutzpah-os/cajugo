"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, type ReactNode } from "react";
import { cn } from "./cn";
import { initialsOf } from "./initials";
import { Logo } from "./logo";

export type NavItem = {
  href: string;
  label: string;
  /** Fica na barra inferior do celular (até 4); os demais vão para o "Mais". */
  mobile?: boolean;
  /** Pendências do item (ex.: alertas com veículo); 0 ou ausente não mostra nada. */
  count?: number;
};

/** Selo com o número de pendências, lido como "N pendentes" pelo leitor de tela. */
function Count({ n }: { n?: number }) {
  if (!n) return null;
  return (
    <span
      data-testid="nav-count"
      className="ml-auto min-w-6 rounded-full bg-caju px-1.5 text-center text-xs leading-6 font-bold text-white"
    >
      {n}
      <span className="sr-only"> pendentes</span>
    </span>
  );
}

/** O primeiro item (início do painel) só fica ativo nele mesmo. */
export function isActive(pathname: string, href: string, root: string) {
  if (href === root) return pathname === root;
  return pathname === href || pathname.startsWith(`${href}/`);
}

const tabClass =
  "relative flex h-12 w-full flex-col items-center justify-center gap-[3px] px-1 text-center text-[11px] font-semibold text-text-3 aria-[current=page]:text-caju";

/** Barrinha do item ativo na barra inferior (DESIGN.md §3). */
function ActiveMark({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={cn("h-1 w-[22px] rounded-sm bg-caju", !on && "opacity-0")}
    />
  );
}

/**
 * Menu do painel (DESIGN.md §3): barra inferior no celular com os itens `mobile`
 * e, se sobrar item, um "Mais" que abre a gaveta com o resto; barra lateral com
 * todos no computador (≥ 1024 px). Item ativo em `caju`.
 */
export type SidebarIdentity = { name: string; caption?: string };

export function PanelNavView({
  items,
  pathname,
  identity,
  tag,
  footer,
}: {
  items: NavItem[];
  pathname: string;
  /** Card da loja ou da pessoa no topo da sidebar [15b]. */
  identity?: SidebarIdentity | null;
  /** Selo ao lado do logo ("Admin", [15c]). */
  tag?: string;
  /** Pé da sidebar (conta: trocar de painel e sair). */
  footer?: ReactNode;
}) {
  const drawer = useRef<HTMLDialogElement>(null);
  const root = items[0]?.href ?? "";
  const current = (href: string) =>
    isActive(pathname, href, root) ? ("page" as const) : undefined;
  const bar = items.filter((i) => i.mobile);
  const more = items.filter((i) => !i.mobile);
  const moreActive = more.some((i) => current(i.href));
  const close = () => drawer.current?.close();

  return (
    <>
      <nav
        aria-label="Menu do painel (celular)"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface px-2 pt-2 pb-[max(env(safe-area-inset-bottom),18px)] lg:hidden"
      >
        <ul
          className="mx-auto grid max-w-[480px]"
          style={{
            gridTemplateColumns: `repeat(${bar.length + (more.length ? 1 : 0)}, minmax(0, 1fr))`,
          }}
        >
          {bar.map((i) => (
            <li key={i.href}>
              <Link
                href={i.href}
                aria-current={current(i.href)}
                className={tabClass}
              >
                <ActiveMark on={!!current(i.href)} />
                {i.label}
                {!!i.count && (
                  <span
                    data-testid="nav-count"
                    className="absolute top-1 right-[calc(50%-2.5rem)] min-w-5 rounded-full bg-caju px-1 text-center text-[11px] leading-5 font-bold text-white"
                  >
                    {i.count}
                    <span className="sr-only"> pendentes</span>
                  </span>
                )}
              </Link>
            </li>
          ))}
          {more.length > 0 && (
            <li>
              <button
                type="button"
                aria-haspopup="dialog"
                aria-current={moreActive ? "page" : undefined}
                onClick={() => drawer.current?.showModal()}
                className={tabClass}
              >
                <ActiveMark on={moreActive} />
                Mais
                {more.some((i) => i.count) && (
                  <span
                    data-testid="more-dot"
                    aria-hidden
                    className="absolute top-2 right-[calc(50%-1.5rem)] size-2 rounded-full bg-caju"
                  />
                )}
              </button>
            </li>
          )}
        </ul>
        {more.length > 0 && (
          <dialog
            ref={drawer}
            aria-label="Mais opções do painel"
            onClick={(e) => {
              // Toque no fundo escurecido fecha a gaveta.
              if (e.target === e.currentTarget) close();
            }}
            className="m-0 ml-auto h-dvh max-h-none w-[318px] max-w-[85vw] bg-surface p-4 backdrop:bg-[rgba(28,27,32,.55)]"
          >
            <div className="flex items-center justify-between">
              <p className="text-[17px] font-extrabold">Mais</p>
              <button
                type="button"
                onClick={close}
                className="flex h-11 items-center px-2 text-sm font-semibold text-text-2"
              >
                Fechar
              </button>
            </div>
            <ul className="mt-2 flex flex-col">
              {more.map((i) => (
                <li
                  key={i.href}
                  className="border-b border-line-2 last:border-0"
                >
                  <Link
                    href={i.href}
                    onClick={close}
                    aria-current={current(i.href)}
                    className="flex min-h-12 items-center text-[15px] font-bold aria-[current=page]:text-caju-deep"
                  >
                    {i.label}
                    <Count n={i.count} />
                  </Link>
                </li>
              ))}
            </ul>
          </dialog>
        )}
      </nav>

      <nav
        aria-label="Menu do painel"
        data-testid="sidebar"
        className="fixed inset-y-0 left-0 z-10 hidden w-60 flex-col gap-5 overflow-y-auto bg-ink px-3.5 pt-6 pb-4 lg:flex"
      >
        <div className="flex items-center gap-2 px-2">
          <Logo tone="dark" />
          {tag && (
            <span className="text-[10px] font-bold tracking-[0.06em] text-on-dark-2 uppercase">
              {tag}
            </span>
          )}
        </div>
        {identity && (
          <div
            data-testid="sidebar-identity"
            className="flex items-center gap-2.5 rounded-xl bg-ink-2 p-2.5"
          >
            <span
              aria-hidden
              className="flex size-[30px] flex-none items-center justify-center rounded-lg bg-caju text-xs font-extrabold text-white"
            >
              {initialsOf(identity.name)}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-[13px] font-bold text-white">
                {identity.name}
              </span>
              {identity.caption && (
                <span className="truncate text-[11px] text-on-dark-2">
                  {identity.caption}
                </span>
              )}
            </span>
          </div>
        )}
        <ul className="flex flex-col gap-0.5">
          {items.map((i) => (
            <li key={i.href}>
              <Link
                href={i.href}
                aria-current={current(i.href)}
                className={cn(
                  "flex min-h-11 items-center rounded-input px-3 text-sm font-semibold text-on-dark-2 hover:bg-ink-2 hover:text-white",
                  "aria-[current=page]:bg-ink-2 aria-[current=page]:text-white",
                )}
              >
                {i.label}
                <Count n={i.count} />
              </Link>
            </li>
          ))}
        </ul>
        {footer && <div className="mt-auto">{footer}</div>}
      </nav>
    </>
  );
}

export function PanelNav(
  props: Omit<Parameters<typeof PanelNavView>[0], "pathname">,
) {
  return <PanelNavView {...props} pathname={usePathname()} />;
}
