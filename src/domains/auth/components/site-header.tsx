import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { getDb } from "@/platform/db/client";
import { Logo } from "@/ui/logo";
import { SiteMenu } from "@/ui/site-menu";
import { currentSession } from "../current";
import { accountMenu } from "../service";

/** Lê a sessão por requisição; o resto da página fica estático (SEO.md §2). */
async function AccountMenu() {
  await connection();
  return (
    <SiteMenu account={await accountMenu(getDb(), await currentSession())} />
  );
}

/** Cabeçalho das páginas públicas: logo + menu [11a] (STO-FR-001). */
export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-[480px] items-center justify-between px-4 pt-3 md:max-w-5xl">
      <Link
        href="/"
        aria-label="CajuGo, página inicial"
        className="flex min-h-11 items-center"
      >
        <Logo />
      </Link>
      <Suspense fallback={<SiteMenu account={null} />}>
        <AccountMenu />
      </Suspense>
    </header>
  );
}
