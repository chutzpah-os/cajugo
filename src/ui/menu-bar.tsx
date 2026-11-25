"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ChevronDownIcon } from "./icons";
import { SITE_NAV, type NavItem } from "./site-nav";

export function SoonBadge() {
  return (
    <span className="flex-none rounded-full bg-warn-soft px-2 py-0.5 text-[11px] font-bold whitespace-nowrap text-warn">
      Em breve
    </span>
  );
}

/** Opção de um menu: link, ou o nome com **Em breve** (HOM-FR-005). */
export function NavOption({
  item,
  className,
  onPick,
}: {
  item: NavItem;
  className: string;
  onPick?: () => void;
}) {
  return item.href ? (
    <Link href={item.href} className={className} onClick={onPick}>
      {item.label}
    </Link>
  ) : (
    <span
      aria-disabled="true"
      className={`${className} justify-between gap-3 text-text-3`}
    >
      {item.label}
      <SoonBadge />
    </span>
  );
}

/**
 * Menus do cabeçalho do desktop (017, HOM-FR-003): cada um abre a lista de opções.
 * `<details>` abre sem JavaScript; com ele, só um fica aberto e fecha ao clicar fora,
 * no Esc ou ao escolher.
 */
export function MenuBar({ active }: { active?: string | null }) {
  const bar = useRef<HTMLElement>(null);
  useEffect(() => {
    const closeAll = (except?: Element) =>
      bar.current
        ?.querySelectorAll("details[open]")
        .forEach((d) => d !== except && d.removeAttribute("open"));
    const onClick = (e: MouseEvent) => {
      const inside = (e.target as Element).closest("details");
      if (!bar.current?.contains(e.target as Node)) closeAll();
      else if (inside) closeAll(inside);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeAll();
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);
  const close = () =>
    bar.current
      ?.querySelectorAll("details[open]")
      .forEach((d) => d.removeAttribute("open"));
  return (
    <nav
      ref={bar}
      aria-label="Site"
      className="hidden items-center gap-0 lg:flex xl:gap-1"
    >
      {SITE_NAV.map((s) => (
        <details key={s.key} className="group relative">
          <summary
            aria-current={active === s.key ? "page" : undefined}
            className="flex min-h-11 cursor-pointer list-none items-center gap-1 rounded-input px-2 text-[13px] font-bold text-ink xl:px-2.5 xl:text-sm group-open:bg-bg aria-[current=page]:text-caju [&::-webkit-details-marker]:hidden"
          >
            {s.label}
            <ChevronDownIcon
              size={14}
              className="transition-transform group-open:rotate-180"
            />
          </summary>
          <ul className="absolute top-full left-0 z-40 mt-1 flex min-w-[250px] flex-col rounded-card border border-line bg-surface py-1.5 shadow-lg">
            {s.items.map((i) => (
              <li key={i.label}>
                <NavOption
                  item={i}
                  onPick={close}
                  className="flex min-h-11 items-center px-4 text-sm font-medium text-text-2 hover:bg-bg hover:text-ink"
                />
              </li>
            ))}
          </ul>
        </details>
      ))}
    </nav>
  );
}
