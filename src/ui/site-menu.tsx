"use client";

import Link from "next/link";
import { Drawer } from "./drawer";
import { ChevronDownIcon } from "./icons";
import { NavOption } from "./menu-bar";
import { SITE_NAV } from "./site-nav";

export type MenuAccount = {
  name: string;
  panels: { label: string; href: string }[];
} | null;

const linkClass =
  "flex min-h-12 items-center border-b border-line-2 text-[15px] font-bold";

/** Menu da home [11a] (STO-FR-001): navegação pública e, se conectado, os painéis. */
export function SiteMenu({ account }: { account: MenuAccount }) {
  return (
    <Drawer
      label="Menu"
      triggerLabel={
        <>
          <span aria-hidden className="text-xl leading-none">
            ☰
          </span>
          <span className="sr-only">Abrir menu</span>
        </>
      }
      triggerClassName="flex size-11 items-center justify-center"
    >
      <nav aria-label="Menu principal" className="mt-2 flex flex-col">
        <Link href="/" className={linkClass}>
          Início
        </Link>
        {SITE_NAV.map((section) => (
          <details
            key={section.key}
            className="group border-b border-line-2"
            data-testid={`menu-${section.key}`}
          >
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between text-[15px] font-bold [&::-webkit-details-marker]:hidden">
              {section.label}
              <ChevronDownIcon
                size={16}
                className="text-text-3 transition-transform group-open:rotate-180"
              />
            </summary>
            <ul className="flex flex-col pb-2 pl-3">
              {section.items.map((i) => (
                <li key={i.label}>
                  <NavOption
                    item={i}
                    className="flex min-h-11 items-center text-[15px] text-text-2"
                  />
                </li>
              ))}
            </ul>
          </details>
        ))}
        {account ? (
          <div className="mt-4 flex flex-col">
            <p className="text-sm text-text-2">
              Olá, <strong className="text-ink">{account.name}</strong>
            </p>
            {account.panels.map((p) => (
              <Link key={p.href} href={p.href} className={linkClass}>
                {p.label}
              </Link>
            ))}
          </div>
        ) : (
          <Link href="/entrar" className={`${linkClass} mt-4 text-caju-ink`}>
            Entrar
          </Link>
        )}
      </nav>
    </Drawer>
  );
}
