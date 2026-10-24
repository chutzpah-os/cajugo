"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { cn } from "./cn";

export type NavItem = {
  href: string;
  label: string;
  /** Fica na barra inferior do celular (até 4); os demais vão para o "Mais". */
  mobile?: boolean;
};

/** O primeiro item (início do painel) só fica ativo nele mesmo. */
export function isActive(pathname: string, href: string, root: string) {
  if (href === root) return pathname === root;
  return pathname === href || pathname.startsWith(`${href}/`);
}

const tabClass =
  "relative flex min-h-14 w-full items-center justify-center px-1 text-center text-xs font-semibold text-text-3 aria-[current=page]:text-caju";

/** Barrinha do item ativo na barra inferior (DESIGN.md §3). */
function ActiveMark() {
  return (
    <span
      aria-hidden
      className="absolute top-0 h-1 w-[22px] rounded-b bg-caju"
    />
  );
}

/**
 * Menu do painel (DESIGN.md §3): barra inferior no celular com os itens `mobile`
 * e, se sobrar item, um "Mais" que abre a gaveta com o resto; barra lateral com
 * todos no computador (≥ 1024 px). Item ativo em `caju`.
 */
export function PanelNavView({
  items,
  pathname,
}: {
  items: NavItem[];
  pathname: string;
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
        className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
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
                {current(i.href) && <ActiveMark />}
                {i.label}
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
                {moreActive && <ActiveMark />}
                Mais
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
                  </Link>
                </li>
              ))}
            </ul>
          </dialog>
        )}
      </nav>

      <nav
        aria-label="Menu do painel"
        className="hidden w-56 shrink-0 lg:block"
      >
        <ul className="sticky top-4 flex flex-col gap-0.5">
          {items.map((i) => (
            <li key={i.href}>
              <Link
                href={i.href}
                aria-current={current(i.href)}
                className={cn(
                  "flex min-h-11 items-center rounded-input px-3 text-[15px] font-semibold text-text-2 hover:bg-line-2",
                  "aria-[current=page]:bg-caju-soft aria-[current=page]:text-caju-deep",
                )}
              >
                {i.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}

export function PanelNav({ items }: { items: NavItem[] }) {
  return <PanelNavView items={items} pathname={usePathname()} />;
}
