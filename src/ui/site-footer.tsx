import Link from "next/link";
import { Logo } from "./logo";
import { SITE_NAV } from "./site-nav";

const LEGAL = [
  { label: "Termos de uso e privacidade", href: "/termos" },
  { label: "Anunciar minha loja", href: "/lojistas" },
  { label: "Caju Indica", href: "/indica/cadastro" },
  { label: "Rede Caju", href: "/rede-caju/cadastro" },
];

/**
 * Rodapé das páginas públicas (015, PRC-FR-009): o logo, **Topo ↑** e as colunas dos
 * menus do site (017), com os itens Em breve; embaixo, os links institucionais. Toda
 * página com o cabeçalho do site termina com ele.
 */
export function SiteFooter({
  barSpace = false,
}: {
  /** Página com uma barra fixa embaixo (veículo, lojistas): espaço para ela. */
  barSpace?: boolean;
}) {
  return (
    <footer
      data-testid="site-footer"
      className="mt-auto w-full border-t border-line bg-surface"
    >
      <div
        className={`mx-auto flex w-full max-w-[480px] flex-col gap-8 px-4 py-10 md:max-w-3xl lg:max-w-6xl lg:px-6 xl:max-w-7xl ${barSpace ? "pb-28" : ""}`}
      >
        <div className="flex items-center justify-between gap-4 border-b border-line pb-6">
          <Link
            href="/"
            aria-label="CajuGo, página inicial"
            className="flex min-h-11 items-center"
          >
            <Logo />
          </Link>
          <div className="flex items-center gap-6">
            <p className="flex items-center gap-2 text-[13px] text-text-3">
              <span aria-hidden className="size-2 rounded-full bg-castanha" />
              Em breve
            </p>
            <a
              href="#"
              className="flex min-h-11 items-center gap-1 text-sm font-bold text-ink"
            >
              Topo <span aria-hidden>↑</span>
            </a>
          </div>
        </div>
        <nav
          aria-label="Mapa do site"
          className="grid grid-cols-2 gap-x-8 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-8"
        >
          {SITE_NAV.map((section) => (
            <section key={section.key} className="flex flex-col gap-2">
              <h2 className="text-[15px] font-extrabold">{section.label}</h2>
              <ul className="flex flex-col gap-1">
                {section.items.map((item) => (
                  <li key={item.label}>
                    {item.href ? (
                      <Link
                        href={item.href}
                        className="block py-1.5 text-sm leading-snug text-text-2 hover:text-ink"
                      >
                        {item.label}
                      </Link>
                    ) : (
                      // Em breve: ponto amarelo antes do nome, numa linha só (pedido do dono).
                      <span className="flex items-baseline gap-2 py-1.5 text-sm leading-snug text-text-3">
                        <span
                          aria-hidden
                          className="size-2 flex-none translate-y-[-1px] rounded-full bg-castanha"
                        />
                        <span>
                          {item.label}
                          <span className="sr-only"> (em breve)</span>
                        </span>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </nav>
        <div className="flex flex-col gap-3 border-t border-line pt-6 lg:flex-row lg:items-center lg:justify-between">
          <ul className="flex flex-wrap gap-x-6">
            {LEGAL.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="flex min-h-11 items-center text-[13px] text-text-2 hover:text-ink"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
            <a
              href="https://www.instagram.com/caju.go/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-11 items-center gap-2 text-[13px] font-bold text-ink hover:text-caju-ink"
            >
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
              </svg>
              Instagram @caju.go
            </a>
            <p className="text-[13px] text-text-3">
              © CajuGo · A sua plataforma automotiva
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
