"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "./cn";

export type NavItem = {
  href: string;
  label: string;
  /** Aparece também na barra inferior do celular (até 4 itens). */
  mobile?: boolean;
};

/** O primeiro item (início do painel) só fica ativo nele mesmo. */
export function isActive(pathname: string, href: string, root: string) {
  if (href === root) return pathname === root;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Menu do painel (DESIGN.md §3): barra inferior com 4 itens no celular,
 * barra lateral no computador (≥ 1024 px). Item ativo em `caju`.
 */
export function PanelNavView({
  items,
  pathname,
}: {
  items: NavItem[];
  pathname: string;
}) {
  const root = items[0]?.href ?? "";
  const current = (href: string) =>
    isActive(pathname, href, root) ? ("page" as const) : undefined;

  return (
    <>
      <nav
        aria-label="Menu do painel (celular)"
        className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <ul className="mx-auto grid max-w-[480px] grid-cols-4">
          {items
            .filter((i) => i.mobile)
            .map((i) => (
              <li key={i.href}>
                <Link
                  href={i.href}
                  aria-current={current(i.href)}
                  className="relative flex min-h-14 items-center justify-center px-1 text-center text-xs font-semibold text-text-3 aria-[current=page]:text-caju"
                >
                  {current(i.href) && (
                    <span
                      aria-hidden
                      className="absolute top-0 h-1 w-[22px] rounded-b bg-caju"
                    />
                  )}
                  {i.label}
                </Link>
              </li>
            ))}
        </ul>
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
