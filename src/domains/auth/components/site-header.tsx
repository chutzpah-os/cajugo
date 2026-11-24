import Link from "next/link";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import { getDb } from "@/platform/db/client";
import { cn } from "@/ui/cn";
import { Logo } from "@/ui/logo";
import { SiteMenu, type MenuAccount } from "@/ui/site-menu";
import { currentSession } from "../current";
import { accountMenu } from "../service";

/** Links do cabeçalho do desktop [15a]; "Comprar veículos" ativo na vitrine. */
const LINKS = [
  ["/", "Comprar veículos"],
  ["/lojistas", "Produtos"],
  ["/indica/cadastro", "Caju Indica"],
  ["/favoritos", "Favoritos"],
] as const;

function Account({ account }: { account: MenuAccount }) {
  const panel = account?.panels[0];
  return (
    <>
      {panel ? (
        <Link
          href={panel.href}
          className="hidden h-10 items-center rounded-input bg-ink px-4 text-sm font-bold text-white lg:flex"
        >
          {account.name}
        </Link>
      ) : (
        <>
          <Link
            href="/entrar"
            className="flex h-10 items-center rounded-input border-[1.5px] border-field bg-surface px-3.5 text-sm font-bold lg:hidden"
          >
            Entrar
          </Link>
          <Link
            href="/entrar"
            className="hidden h-10 items-center rounded-input bg-ink px-4 text-sm font-bold text-white lg:flex"
          >
            Entrar
          </Link>
        </>
      )}
      <span className="lg:hidden">
        <SiteMenu account={account} />
      </span>
    </>
  );
}

/** Lê a sessão por requisição; o resto da página fica estático (SEO.md §2). */
async function AccountSlot() {
  await connection();
  return (
    <Account account={await accountMenu(getDb(), await currentSession())} />
  );
}

/**
 * Cabeçalho das páginas públicas (STO-FR-001, BUY-FR-005), como no design:
 * - celular [9a]: branco, logo, **Entrar** e o menu [11a];
 * - desktop [15a]: logo, a busca, Comprar veículos · Produtos · Caju Indica ·
 *   Favoritos e **Entrar**.
 * `search`: a busca da vitrine no desktop; `joined`: a faixa de busca do celular vem
 * logo abaixo, sem divisória.
 */
export function SiteHeader({
  search,
  active = "/",
  joined = false,
  brand,
}: {
  search?: ReactNode;
  active?: string | null;
  joined?: boolean;
  /** Identidade da loja no lugar do logo (catálogo da loja, [1a] modo lojista). */
  brand?: ReactNode;
}) {
  return (
    <header
      className={cn(
        "w-full bg-surface",
        joined ? "lg:border-b lg:border-line" : "border-b border-line",
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-[480px] items-center justify-between gap-4 px-4 md:max-w-3xl lg:max-w-none lg:px-7">
        <div className="flex min-w-0 items-center gap-8">
          {brand ?? (
            <Link
              href="/"
              aria-label="CajuGo, página inicial"
              className="flex min-h-11 flex-none items-center"
            >
              <Logo />
            </Link>
          )}
          {search && <div className="hidden w-[270px] lg:block">{search}</div>}
        </div>
        <div className="flex items-center gap-2 lg:gap-7">
          <nav aria-label="Site" className="hidden items-center gap-6 lg:flex">
            {LINKS.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                aria-current={active === href ? "page" : undefined}
                className="flex min-h-11 items-center text-sm font-bold text-ink aria-[current=page]:text-caju"
              >
                {label}
              </Link>
            ))}
          </nav>
          <Suspense fallback={<Account account={null} />}>
            <AccountSlot />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
