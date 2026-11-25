import Link from "next/link";
import { parseFilters } from "../filters";
import { CatalogNavigation } from "./catalog-navigation";
import { SearchBox } from "./search-box";
import { SellPitch } from "./sell-pitch";
import { ShowcaseHero } from "./showcase-hero";
import { ShowcasePanel } from "./showcase-panel";
import { TypeStrip } from "./type-strip";

const SHOWCASE = "/veiculos";
const NONE = parseFilters({});

const PRODUCTS = [
  {
    name: "Catálogo para lojas",
    text: "O estoque da sua loja online, com link próprio e os interessados no WhatsApp.",
    href: "/lojistas",
  },
  {
    name: "Rede Caju",
    text: "Venda veículos das lojas parceiras e ganhe comissão por venda.",
    href: "/rede-caju/cadastro",
  },
  {
    name: "Caju Indica",
    text: "Indique uma loja para a CajuGo e ganhe R$ 30 por mês.",
    href: "/indica/cadastro",
  },
  {
    name: "LaudoCaju",
    text: "Consulta veicular: débitos, restrições e sinais de batida antes de comprar.",
    href: null,
  },
] as const;

/**
 * Página inicial (017, HOM-FR-001): a abertura, o quadro Buscar · Vender (a busca e a
 * faixa de tipos levam à vitrine em `/veiculos`) e os produtos da CajuGo.
 */
export function HomeView() {
  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-8 px-4 pb-12 md:max-w-3xl lg:max-w-5xl lg:px-8">
      <h1 className="sr-only">CajuGo: veículos novos e usados das lojas</h1>
      <div className="flex flex-col gap-4 lg:gap-7">
        <ShowcaseHero />
        <CatalogNavigation>
          <ShowcasePanel
            search={
              <>
                <SearchBox filters={NONE} basePath={SHOWCASE} hidden={[]} />
                <TypeStrip filters={NONE} basePath={SHOWCASE} />
                <Link
                  href={SHOWCASE}
                  className="flex h-11 items-center self-start text-sm font-bold text-caju-ink"
                >
                  Ver todos os veículos →
                </Link>
              </>
            }
            sell={<SellPitch />}
          />
        </CatalogNavigation>
      </div>
      <section aria-labelledby="produtos" className="flex flex-col gap-3">
        <h2 id="produtos" className="text-[22px] font-extrabold">
          Produtos CajuGo
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PRODUCTS.map((p) => (
            <li key={p.name}>
              {p.href ? (
                <Link
                  href={p.href}
                  className="flex h-full flex-col gap-1.5 rounded-card border border-line bg-surface p-4 hover:border-caju"
                >
                  <span className="text-[15px] font-extrabold">{p.name}</span>
                  <span className="text-sm text-text-2">{p.text}</span>
                  <span className="mt-auto pt-2 text-sm font-bold text-caju-ink">
                    Conhecer →
                  </span>
                </Link>
              ) : (
                <div className="flex h-full flex-col gap-1.5 rounded-card border border-line bg-surface p-4">
                  <span className="flex items-center gap-2 text-[15px] font-extrabold">
                    {p.name}
                    <span className="rounded-full bg-castanha/20 px-2 py-0.5 text-[11px] font-bold text-warn">
                      Em breve
                    </span>
                  </span>
                  <span className="text-sm text-text-2">{p.text}</span>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
