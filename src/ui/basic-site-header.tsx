"use client";

import Link from "next/link";
import { Logo } from "./logo";
import { MenuBar } from "./menu-bar";
import { SiteMenu } from "./site-menu";

/**
 * Cabeçalho público para a página de erro, que roda no navegador: logo, os menus (017)
 * e **Entrar**, sem ler a sessão.
 */
export function BasicSiteHeader() {
  return (
    <header className="w-full border-b border-line bg-surface">
      <div className="mx-auto flex h-16 w-full max-w-[480px] items-center justify-between gap-4 px-4 md:max-w-3xl lg:max-w-6xl lg:px-6 xl:max-w-7xl">
        <Link
          href="/"
          aria-label="CajuGo, página inicial"
          className="flex min-h-11 flex-none items-center"
        >
          <Logo />
        </Link>
        <div className="flex items-center gap-2 lg:gap-7">
          <MenuBar />
          <Link
            href="/entrar"
            className="flex h-10 items-center rounded-input bg-ink px-4 text-sm font-bold text-white"
          >
            Entrar
          </Link>
          <span className="lg:hidden">
            <SiteMenu account={null} />
          </span>
        </div>
      </div>
    </header>
  );
}
