"use client";

import Link from "next/link";
import { Drawer } from "./drawer";

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
          Comprar veículos
        </Link>
        <p className="mt-4 text-xs font-bold tracking-wide text-text-3 uppercase">
          Produtos
        </p>
        <Link href="/lojistas" className={linkClass}>
          Catálogo para lojas
        </Link>
        <Link href="/rede/cadastro" className={linkClass}>
          Rede Caju
        </Link>
        <Link href="/indica/cadastro" className={`${linkClass} mt-4`}>
          Caju Indica
        </Link>
        <Link href="/favoritos" className={linkClass}>
          Favoritos
        </Link>
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
